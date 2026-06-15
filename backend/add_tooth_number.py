import sqlite3

def add_column():
    conn = sqlite3.connect("dentalmanager.db")
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE treatments ADD COLUMN tooth_number INTEGER")
        print("Column tooth_number added to treatments.")
    except sqlite3.OperationalError as e:
        print(f"Error (maybe column exists?): {e}")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_column()
