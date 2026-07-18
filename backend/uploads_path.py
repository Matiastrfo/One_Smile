import os
from persistence.database import DB_NAME

# En produccion (PyInstaller onefile) __file__ vive en una carpeta temporal que Windows
# borra al cerrar la app — igual que pasaba con la clave de encriptacion (secret_crypto.py),
# cualquier archivo guardado ahi se pierde al reiniciar. Usamos la carpeta de la base de
# datos (ruta estable en AppData via DB_PATH) en vez de __file__.
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(DB_NAME)), "uploads")
