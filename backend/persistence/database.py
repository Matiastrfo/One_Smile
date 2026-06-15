import sqlite3
import os

DB_NAME = "dentalmanager.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dni TEXT NOT NULL UNIQUE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            professional_id INTEGER NOT NULL,
            date_time TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            professional_id INTEGER NOT NULL,
            date_time TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL DEFAULT 0.0,
            tooth_number INTEGER,
            FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dental_pieces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number INTEGER NOT NULL,
            condition TEXT NOT NULL DEFAULT 'HEALTHY',
            FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
            UNIQUE(patient_id, tooth_number)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medical_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            professional_id INTEGER NOT NULL,
            date_time TEXT NOT NULL,
            description TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS boxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            professional_morning_id INTEGER,
            professional_afternoon_id INTEGER,
            contract_duration_morning INTEGER DEFAULT 1,
            contract_duration_afternoon INTEGER DEFAULT 1,
            specialty_morning TEXT,
            specialty_afternoon TEXT,
            FOREIGN KEY (professional_morning_id) REFERENCES users (id) ON DELETE SET NULL,
            FOREIGN KEY (professional_afternoon_id) REFERENCES users (id) ON DELETE SET NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS box_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            professional_id INTEGER NOT NULL,
            box_id INTEGER NOT NULL,
            shift TEXT NOT NULL,
            month_year TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            payment_date TEXT,
            amount REAL,
            notes TEXT,
            FOREIGN KEY (professional_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (box_id) REFERENCES boxes (id) ON DELETE CASCADE
        )
    """)
    
    # Seed de admin por defecto
    # El password '12345' hasheado con bcrypt (usaremos un hash pre-generado de '12345' para simplicidad y consistencia en init_db)
    # Generado usando passlib.hash.bcrypt.hash("12345")
    admin_email = "admin@dentalmanager.com"
    cursor.execute("SELECT id FROM users WHERE email = ?", (admin_email,))
    if not cursor.fetchone():
        # Hash for '12345' password
        admin_hash = "$2b$12$26rIxftRoI.ZoYYJ.7l7veyk1tZq/dWQNXyc0zBVuVCdtPqOct3jC"
        cursor.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
            (admin_email, admin_hash, "admin")
        )

    conn.commit()
    conn.close()

def get_connection():
    return sqlite3.connect(DB_NAME)
