import aiosmtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

load_dotenv()  # загружаем переменные из .env

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

async def send_email(to_email: str, subject: str, body: str):
    msg = EmailMessage()
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        await aiosmtplib.send(
            message=msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True,
        )
        print(f"[EMAIL] sent to {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

# удобный алиас для 2FA и рассылок
async def send_2fa_email(to_email: str, code: str):
    subject = "Код подтверждения 2FA"
    body = f"Ваш код подтверждения: {code}"
    await send_email(to_email, subject, body)
