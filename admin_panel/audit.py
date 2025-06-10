import psycopg2

def log_action(username: str, action: str, detail: str = ""):
    """
    Записывает действие пользователя в audit_log.
    :param username: имя пользователя
    :param action: короткое название действия (например: 'login', 'submit_application')
    :param detail: дополнительная информация (например: 'AppID=42')
    """
    try:
        with psycopg2.connect(
            host="db",
            port=5432,
            dbname="common_app",
            user="admin",
            password="adminpass"
        ) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO audit_log (username, action, detail) VALUES (%s, %s, %s)",
                    (username, action, detail)
                )
    except Exception as e:
        print(f"[AUDIT LOGGING ERROR] {e}")
