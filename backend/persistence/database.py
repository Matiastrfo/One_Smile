import sqlite3
import os
from datetime import datetime

DB_NAME = os.environ.get("DB_PATH", "dentalmanager.db")

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dni TEXT,
            professional_id INTEGER REFERENCES users(id)
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
            role TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT ''
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
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            professional_id INTEGER NOT NULL,
            box_id INTEGER NOT NULL,
            shift TEXT NOT NULL,
            start_month_year TEXT NOT NULL,
            duration_months INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            previous_contract_id INTEGER,
            FOREIGN KEY (professional_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (box_id) REFERENCES boxes (id) ON DELETE CASCADE,
            FOREIGN KEY (previous_contract_id) REFERENCES contracts (id) ON DELETE SET NULL
        )
    """)

    # Migración: odontogram — reemplazar columna condition por treatment_type, color, faces
    cursor.execute("PRAGMA table_info(dental_pieces)")
    dp_cols = [c[1] for c in cursor.fetchall()]
    if "treatment_type" not in dp_cols:
        # Crear tabla nueva con el esquema correcto
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dental_pieces_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                tooth_number INTEGER NOT NULL,
                treatment_type TEXT NOT NULL DEFAULT 'NONE',
                color TEXT,
                faces TEXT NOT NULL DEFAULT '[]',
                FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
                UNIQUE(patient_id, tooth_number)
            )
        """)
        if "condition" in dp_cols:
            # Migrar datos existentes mapeando condition vieja → treatment_type nueva
            cursor.execute("SELECT id, patient_id, tooth_number, condition FROM dental_pieces")
            for row in cursor.fetchall():
                old_cond = row[3]
                if old_cond == "CARIES":
                    new_type, new_color = "CARIES", "BLUE"
                elif old_cond in ("FILLED",):
                    new_type, new_color = "FILLING", "GREEN"
                elif old_cond == "CROWN":
                    new_type, new_color = "CROWN", "GREEN"
                elif old_cond == "EXTRACTED":
                    new_type, new_color = "EXTRACTED", "RED"
                else:
                    new_type, new_color = "NONE", None
                cursor.execute(
                    "INSERT INTO dental_pieces_new (id, patient_id, tooth_number, treatment_type, color, faces) VALUES (?, ?, ?, ?, ?, '[]')",
                    (row[0], row[1], row[2], new_type, new_color),
                )
        cursor.execute("DROP TABLE IF EXISTS dental_pieces")
        cursor.execute("ALTER TABLE dental_pieces_new RENAME TO dental_pieces")

    # Migración: hacer dni nullable y agregar professional_id si no existe
    cursor.execute("PRAGMA table_info(patients)")
    p_cols_info = cursor.fetchall()
    p_columns = [c[1] for c in p_cols_info]
    # Detectar si dni sigue siendo NOT NULL (necesita recrear tabla)
    dni_not_null = any(c[1] == "dni" and c[3] == 1 for c in p_cols_info)  # notnull flag
    needs_recreate = dni_not_null or "professional_id" not in p_columns
    if needs_recreate:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS patients_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                dni TEXT,
                professional_id INTEGER REFERENCES users(id)
            )
        """)
        if "professional_id" in p_columns:
            cursor.execute("INSERT INTO patients_new (id, name, dni, professional_id) SELECT id, name, dni, professional_id FROM patients")
        else:
            cursor.execute("INSERT INTO patients_new (id, name, dni) SELECT id, name, dni FROM patients")
        cursor.execute("DROP TABLE patients")
        cursor.execute("ALTER TABLE patients_new RENAME TO patients")
        # Backfill: asignar pacientes existentes al admin
        cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        admin_row = cursor.fetchone()
        if admin_row:
            cursor.execute("UPDATE patients SET professional_id = ? WHERE professional_id IS NULL", (admin_row[0],))

    # Migración: agregar columna day_of_week a contracts si no existe
    cursor.execute("PRAGMA table_info(contracts)")
    c_columns = [c[1] for c in cursor.fetchall()]
    if "day_of_week" not in c_columns:
        cursor.execute("ALTER TABLE contracts ADD COLUMN day_of_week TEXT DEFAULT 'MONDAY'")
        cursor.execute("UPDATE contracts SET day_of_week = 'MONDAY' WHERE day_of_week IS NULL")

    # Migración: agregar columna contract_id a box_payments si no existe
    cursor.execute("PRAGMA table_info(box_payments)")
    bp_columns = [c[1] for c in cursor.fetchall()]
    if "contract_id" not in bp_columns:
        cursor.execute("ALTER TABLE box_payments ADD COLUMN contract_id INTEGER REFERENCES contracts(id)")

    # Backfill: crear contratos ACTIVE para asignaciones existentes que no tengan uno,
    # y vincular sus box_payments huérfanos al contrato recién creado.
    current_month = datetime.now().strftime('%Y-%m')
    cursor.execute("SELECT id, professional_morning_id, professional_afternoon_id, contract_duration_morning, contract_duration_afternoon FROM boxes")
    for box_id, prof_morning, prof_afternoon, dur_morning, dur_afternoon in cursor.fetchall():
        for prof_id, shift, duration in (
            (prof_morning, 'MORNING', dur_morning),
            (prof_afternoon, 'AFTERNOON', dur_afternoon),
        ):
            if not prof_id:
                continue
            cursor.execute(
                "SELECT id FROM contracts WHERE box_id = ? AND shift = ? AND status = 'ACTIVE'",
                (box_id, shift)
            )
            existing = cursor.fetchone()
            if existing:
                contract_id = existing[0]
            else:
                cursor.execute(
                    "SELECT MIN(month_year) FROM box_payments WHERE box_id = ? AND shift = ? AND professional_id = ?",
                    (box_id, shift, prof_id)
                )
                min_month = cursor.fetchone()[0] or current_month
                cursor.execute(
                    "INSERT INTO contracts (professional_id, box_id, shift, start_month_year, duration_months, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')",
                    (prof_id, box_id, shift, min_month, duration or 1)
                )
                contract_id = cursor.lastrowid

            cursor.execute(
                "UPDATE box_payments SET contract_id = ? WHERE box_id = ? AND shift = ? AND professional_id = ? AND contract_id IS NULL",
                (contract_id, box_id, shift, prof_id)
            )

    # Tablas: presupuestos
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            professional_id INTEGER,
            created_at TEXT NOT NULL,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budget_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            budget_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
        )
    """)

    # Migración: agregar columna notes a appointments
    cursor.execute("PRAGMA table_info(appointments)")
    appt_cols = [r[1] for r in cursor.fetchall()]
    if "notes" not in appt_cols:
        cursor.execute("ALTER TABLE appointments ADD COLUMN notes TEXT")

    # Migración: agregar columnas a patients si no existen
    cursor.execute("PRAGMA table_info(patients)")
    patient_columns = [row[1] for row in cursor.fetchall()]
    for col in [
        ("phone", "TEXT"), ("blood_type", "TEXT"), ("allergies", "TEXT"),
        ("diseases", "TEXT"), ("medications", "TEXT"), ("observations", "TEXT"),
        ("last_name", "TEXT"), ("social_security", "TEXT"), ("social_security_number", "TEXT"),
        ("address", "TEXT"), ("province", "TEXT"), ("city", "TEXT"),
        ("email", "TEXT"), ("birth_date", "TEXT"), ("photo_path", "TEXT"),
    ]:
        if col[0] not in patient_columns:
            cursor.execute(f"ALTER TABLE patients ADD COLUMN {col[0]} {col[1]}")

    # Migración: agregar columnas name y avatar_path a users si no existen
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [row[1] for row in cursor.fetchall()]
    if "name" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
    if "avatar_path" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_path TEXT")

    # Migración: agregar columna odontogram_type a treatments si no existe
    cursor.execute("PRAGMA table_info(treatments)")
    t_columns = [row[1] for row in cursor.fetchall()]
    if "odontogram_type" not in t_columns:
        cursor.execute("ALTER TABLE treatments ADD COLUMN odontogram_type TEXT")
    if "odontogram_color" not in t_columns:
        cursor.execute("ALTER TABLE treatments ADD COLUMN odontogram_color TEXT")
    if "odontogram_faces" not in t_columns:
        cursor.execute("ALTER TABLE treatments ADD COLUMN odontogram_faces TEXT")
    if "arch_teeth" not in t_columns:
        cursor.execute("ALTER TABLE treatments ADD COLUMN arch_teeth TEXT")

    # Tabla: imágenes clínicas por paciente
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            professional_id INTEGER,
            date TEXT NOT NULL,
            treatment_type TEXT NOT NULL DEFAULT 'GENERAL',
            description TEXT,
            file_path TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # Tabla: cuenta corriente unificada (trabajos + pagos)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS account_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            professional_id INTEGER,
            date TEXT NOT NULL,
            detail TEXT NOT NULL,
            debe REAL NOT NULL DEFAULT 0,
            haber REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # Tabla: pagos de pacientes (cuenta corriente)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            professional_id INTEGER,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL DEFAULT 'Pago',
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # Tabla: configuración de horarios por profesional
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schedule_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            professional_id INTEGER NOT NULL,
            day_of_week TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 0,
            start_time TEXT NOT NULL DEFAULT '09:00',
            end_time TEXT NOT NULL DEFAULT '18:00',
            slot_duration INTEGER NOT NULL DEFAULT 60,
            FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(professional_id, day_of_week)
        )
    """)

    # Tabla: configuración de email SMTP
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            smtp_host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
            smtp_port INTEGER NOT NULL DEFAULT 587,
            smtp_user TEXT NOT NULL DEFAULT '',
            smtp_password TEXT NOT NULL DEFAULT '',
            from_name TEXT NOT NULL DEFAULT 'OneSmile Odontología',
            enabled INTEGER NOT NULL DEFAULT 0
        )
    """)
    cursor.execute("INSERT OR IGNORE INTO email_config (id) VALUES (1)")

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
