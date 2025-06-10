import random
from datetime import datetime, timedelta
import psycopg2
from fastapi import HTTPException

def generate_code() -> str:
    """Генерирует 6-значный код"""
    return f"{random.randint(100000, 999999)}"

def store_code(username: str, code: str):
    """Сохраняет код в БД с сроком действия 5 минут"""
    expires = datetime.utcnow() + timedelta(minutes=5)
    with psycopg2.connect(
        host="db", port=5432, dbname="common_app", user="admin", password="adminpass"
    ) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM twofa_tokens WHERE username = %s", (username,))
            cur.execute(
                "INSERT INTO twofa_tokens (username, code, expires_at) VALUES (%s, %s, %s)",
                (username, code, expires),
            )

def verify_code(username: str, code: str):
    """Проверяет 2FA-код"""
    with psycopg2.connect(
        host="db", port=5432, dbname="common_app", user="admin", password="adminpass"
    ) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT code, expires_at FROM twofa_tokens WHERE username = %s", (username,))
            row = cur.fetchone()
            if not row or row[0] != code:
                raise HTTPException(status_code=401, detail="Неверный код 2FA")
            if datetime.utcnow() > row[1]:
                raise HTTPException(status_code=401, detail="Срок действия кода истёк")
            cur.execute("DELETE FROM twofa_tokens WHERE username = %s", (username,))
