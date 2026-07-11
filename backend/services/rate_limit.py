from datetime import datetime, timedelta
from fastapi import HTTPException, status


def check_lockout(cursor, key: str) -> None:
    cursor.execute("SELECT locked_until FROM rate_limit_attempts WHERE key = ?", (key,))
    row = cursor.fetchone()
    if row and row[0]:
        locked_until = datetime.fromisoformat(row[0])
        if datetime.utcnow() < locked_until:
            remaining = int((locked_until - datetime.utcnow()).total_seconds() // 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos. Probá de nuevo en {remaining} minuto(s).",
            )
        cursor.execute("DELETE FROM rate_limit_attempts WHERE key = ?", (key,))


def register_failed_attempt(cursor, key: str, max_attempts: int, lockout_minutes: int) -> None:
    cursor.execute("SELECT failed_count FROM rate_limit_attempts WHERE key = ?", (key,))
    row = cursor.fetchone()
    failed_count = (row[0] if row else 0) + 1
    locked_until = None
    if failed_count >= max_attempts:
        locked_until = (datetime.utcnow() + timedelta(minutes=lockout_minutes)).isoformat()
    cursor.execute("""
        INSERT INTO rate_limit_attempts (key, failed_count, locked_until) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET failed_count = excluded.failed_count, locked_until = excluded.locked_until
    """, (key, failed_count, locked_until))


def clear_failed_attempts(cursor, key: str) -> None:
    cursor.execute("DELETE FROM rate_limit_attempts WHERE key = ?", (key,))
