from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from datetime import date
import psycopg2
import bcrypt
import shutil
import os
from io import StringIO
import csv

from admin_panel.twofa import generate_code, store_code, verify_code
from admin_panel.token_manager import create_access_token, create_refresh_token, verify_token
from admin_panel.email_sender import send_2fa_email
from admin_panel.audit import log_action

app = FastAPI()
security = HTTPBearer()
origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_headers=["*"], allow_methods=["*"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    return psycopg2.connect(host="db", port=5432, dbname="common_app", user="admin", password="adminpass")

def get_current_user(token=Depends(security)):
    payload = verify_token(token.credentials)
    return payload

# Schemas
class RegisterForm(BaseModel):
    username: str
    password: str
    role: str
    university_id: int | None = None

class LoginForm(BaseModel):
    username: str
    password: str

class VerifyForm(BaseModel):
    username: str
    code: str

class ApplicationForm(BaseModel):
    full_name: str
    birth_date: str
    motivation: str
    university_id: int
    program_id: int
    answers: list[dict]

class ProfileForm(BaseModel):
    new_password: str | None = None
    university_id: int | None = None

class ProgramForm(BaseModel):
    name: str
    university_id: int

class BulkEmail(BaseModel):
    subject: str
    message: str
    role_filter: str | None = None

# Routes
@app.post("/register")
def register_user(form: RegisterForm):
    hashed = bcrypt.hashpw(form.password.encode(), bcrypt.gensalt()).decode()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO accounts (username, password_hash, role, university_id) VALUES (%s, %s, %s, %s)",
                        (form.username, hashed, form.role, form.university_id))
    log_action(form.username, "register", f"Role={form.role}")
    return {"status": "registered"}

@app.post("/login")
def login_step1(form: LoginForm, background_tasks: BackgroundTasks):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT password_hash FROM accounts WHERE username = %s", (form.username,))
            row = cur.fetchone()
            if row and bcrypt.checkpw(form.password.encode(), row[0].encode()):
                code = generate_code()
                store_code(form.username, code)
                background_tasks.add_task(send_2fa_email, form.username, code)
                return {"status": "2fa_sent"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/verify-2fa")
def verify_2fa(form: VerifyForm, response: Response):
    verify_code(form.username, form.code)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT role FROM accounts WHERE username = %s", (form.username,))
            role = cur.fetchone()[0]
    access = create_access_token(form.username, role)
    refresh = create_refresh_token(form.username)
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, samesite="strict")
    log_action(form.username, "login")
    return {"access_token": access}

@app.post("/refresh")
def refresh_token(response: Response, refresh_token: str = Depends(security)):
    payload = verify_token(refresh_token.credentials, expected_type="refresh")
    access = create_access_token(payload["sub"], payload.get("role"))
    return {"access_token": access}

@app.get("/profile")
def get_profile(user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT username, role, university_id FROM accounts WHERE username = %s", (user["sub"],))
            row = cur.fetchone()
            return {"username": row[0], "role": row[1], "university_id": row[2]}

@app.put("/profile")
def update_profile(form: ProfileForm, user=Depends(get_current_user)):
    updates, params = [], []
    if form.new_password:
        hashed = bcrypt.hashpw(form.new_password.encode(), bcrypt.gensalt()).decode()
        updates.append("password_hash = %s")
        params.append(hashed)
    if form.university_id:
        updates.append("university_id = %s")
        params.append(form.university_id)
    if not updates:
        return {"status": "no changes"}
    params.append(user["sub"])
    query = f"UPDATE accounts SET {', '.join(updates)} WHERE username = %s"
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
    return {"status": "profile updated"}

@app.get("/questions")
def get_questions():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, label, required FROM questions")
            return [{"id": r[0], "label": r[1], "required": r[2]} for r in cur.fetchall()]

@app.post("/submit")
def submit_application(form: ApplicationForm, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT deadline FROM programs WHERE id = %s", (form.program_id,))
            deadline = cur.fetchone()[0]
            if deadline and date.today() > deadline:
                raise HTTPException(status_code=400, detail="Deadline passed")

            cur.execute("SELECT id FROM accounts WHERE username = %s", (user["sub"],))
            user_id = cur.fetchone()[0]
            cur.execute("""
                INSERT INTO applications (user_id, university_id, program_id, full_name, birth_date, motivation)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (user_id, form.university_id, form.program_id, form.full_name, form.birth_date, form.motivation))
            app_id = cur.fetchone()[0]
            for a in form.answers:
                cur.execute("INSERT INTO answers (application_id, question_id, answer) VALUES (%s, %s, %s)",
                            (app_id, a["question_id"], a["answer"]))
    log_action(user["sub"], "submit_application", f"AppID={app_id}")
    return {"status": "submitted"}

@app.post("/upload")
def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    filename = f"{user['sub']}_{file.filename}"
    path = os.path.join("uploads", filename)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    log_action(user["sub"], "upload_file", f"{filename}")
    return {"filename": filename}

@app.get("/files/{filename}")
def serve_file(filename: str, user=Depends(get_current_user)):
    path = os.path.join("uploads", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404)
    return FileResponse(path)

@app.get("/my-files")
def list_files(user=Depends(get_current_user)):
    return [f for f in os.listdir("uploads") if f.startswith(user["sub"] + "_")]

@app.delete("/my-files/{filename}")
def delete_file(filename: str, user=Depends(get_current_user)):
    path = os.path.join("uploads", filename)
    if not filename.startswith(user["sub"] + "_") or not os.path.exists(path):
        raise HTTPException(status_code=403)
    os.remove(path)
    log_action(user["sub"], "delete_file", filename)
    return {"status": "deleted"}

@app.get("/my-applications")
def get_my_apps(user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, full_name, submitted_at, status
                FROM applications WHERE user_id = (SELECT id FROM accounts WHERE username = %s)
            """, (user["sub"],))
            return [{"id": r[0], "full_name": r[1], "submitted_at": r[2], "status": r[3]} for r in cur.fetchall()]

@app.get("/")
def root():
    return {"status": "API is working"}

@app.get("/api/applications")
def list_apps():
    return [
        {"title": "Заявка в Гарвард", "status": "На рассмотрении"},
        {"title": "Заявка в MIT", "status": "Принята"},
    ]
