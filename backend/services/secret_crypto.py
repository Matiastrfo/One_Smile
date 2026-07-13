import os
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from persistence.database import DB_NAME


def _load_key() -> bytes:
    raw = os.getenv("SECRET_ENCRYPTION_KEY", "")
    if not raw:
        # Guardar la clave junto a la base de datos (ruta estable en AppData vía DB_PATH),
        # NO relativa a __file__: en el .exe empaquetado con PyInstaller, __file__ apunta a
        # una carpeta temporal de extracción que Windows borra en cada reinicio, generando
        # una clave nueva cada vez y volviendo indescifrables las contraseñas ya guardadas.
        path = os.path.join(os.path.dirname(os.path.abspath(DB_NAME)), ".secret_key")
        if os.path.exists(path):
            with open(path) as f:
                raw = f.read().strip()
        if not raw:
            raw = base64.urlsafe_b64encode(os.urandom(32)).decode()
            with open(path, "w") as f:
                f.write(raw)
    digest = hashlib.sha256(raw.encode()).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_load_key())


def encrypt_secret(plain: str) -> str:
    if not plain:
        return ""
    return _fernet.encrypt(plain.encode()).decode()


def decrypt_secret(value: str) -> str:
    """Desencripta un secreto. Si el valor no fue encriptado (datos viejos en
    texto plano), lo devuelve tal cual — se re-encriptará la próxima vez que
    se guarde la configuración."""
    if not value:
        return ""
    try:
        return _fernet.decrypt(value.encode()).decode()
    except (InvalidToken, ValueError):
        return value
