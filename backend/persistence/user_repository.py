import sqlite3
from typing import Optional, List
from persistence.database import get_connection
from domain.user import UserInDB, User

class UserRepository:
    def get_by_username(self, username: str) -> Optional[UserInDB]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, email, password_hash, role, name, avatar_path FROM users WHERE name = ? OR email = ? LIMIT 1",
                (username, username)
            )
            row = cursor.fetchone()
            if row:
                return UserInDB(id=row[0], email=row[1], password_hash=row[2], role=row[3], name=row[4] or "", avatar_path=row[5])
            return None
        finally:
            conn.close()

    def get_by_email(self, email: str) -> Optional[UserInDB]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, password_hash, role, name, avatar_path FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row:
                return UserInDB(id=row[0], email=row[1], password_hash=row[2], role=row[3], name=row[4] or "", avatar_path=row[5])
            return None
        finally:
            conn.close()

    def create(self, user_in_db: UserInDB) -> User:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)",
                (user_in_db.email, user_in_db.password_hash, user_in_db.role, user_in_db.name)
            )
            conn.commit()
            new_id = cursor.lastrowid
            return User(id=new_id, email=user_in_db.email, role=user_in_db.role, name=user_in_db.name)
        except sqlite3.IntegrityError:
            conn.close()
            raise ValueError("Email already registered")
        finally:
            conn.close()

    def get_all(self) -> List[User]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, role, name, avatar_path FROM users ORDER BY CASE WHEN role = 'admin' THEN 1 ELSE 2 END, email ASC")
            rows = cursor.fetchall()
            return [User(id=row[0], email=row[1], role=row[2], name=row[3] or "", avatar_path=row[4]) for row in rows]
        finally:
            conn.close()

    def update(self, user_id: int, email=None, role=None, password_hash=None, name=None, avatar_path=None):
        conn = get_connection()
        cursor = conn.cursor()
        fields, params = [], []
        if email:
            fields.append("email = ?"); params.append(email)
        if role:
            fields.append("role = ?"); params.append(role)
        if password_hash:
            fields.append("password_hash = ?"); params.append(password_hash)
        if name is not None:
            fields.append("name = ?"); params.append(name)
        if avatar_path is not None:
            fields.append("avatar_path = ?"); params.append(avatar_path)
        if not fields:
            conn.close(); return None
        params.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()
        cursor.execute("SELECT id, email, role, name, avatar_path FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return User(id=row[0], email=row[1], role=row[2], name=row[3] or "", avatar_path=row[4])
        return None

    def get_by_id(self, user_id: int) -> Optional[User]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, role, name, avatar_path FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return User(id=row[0], email=row[1], role=row[2], name=row[3] or "", avatar_path=row[4])
            return None
        finally:
            conn.close()

    def delete(self, user_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()
        return rows_affected > 0
