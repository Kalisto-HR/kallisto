from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException

SECRET_KEY = "supersecret"  # желательно заменить на os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

def create_access_token(username: str, role: str, expires_minutes: int = 15) -> str:
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload = {"sub": username, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(username: str, expires_days: int = 7) -> str:
    expire = datetime.utcnow() + timedelta(days=expires_days)
    payload = {"sub": username, "type": "refresh", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if expected_type == "refresh" and payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
