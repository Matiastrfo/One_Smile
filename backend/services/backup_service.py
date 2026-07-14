import os
import shutil
import logging
from datetime import datetime
from persistence.database import get_connection, DB_NAME

logger = logging.getLogger(__name__)

BACKUP_PREFIX = "onesmile_"


def default_backup_dir() -> str:
    return os.path.join(os.path.expanduser("~"), "Documents", "ONE Smile", "Backups")


def get_backup_config() -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT destination_path, enabled, keep_count, last_backup_at FROM backup_config WHERE id = 1")
    destination_path, enabled, keep_count, last_backup_at = cursor.fetchone()
    conn.close()
    return {
        "destination_path": destination_path or default_backup_dir(),
        "is_default_path": not destination_path,
        "enabled": bool(enabled),
        "keep_count": keep_count,
        "last_backup_at": last_backup_at,
    }


def save_backup_config(destination_path: str, enabled: bool, keep_count: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE backup_config SET destination_path = ?, enabled = ?, keep_count = ? WHERE id = 1",
        (destination_path or "", 1 if enabled else 0, keep_count),
    )
    conn.commit()
    conn.close()


def list_backups() -> list[dict]:
    folder = get_backup_config()["destination_path"]
    if not os.path.isdir(folder):
        return []

    backups = []
    for fname in os.listdir(folder):
        if fname.startswith(BACKUP_PREFIX) and fname.endswith(".db"):
            fpath = os.path.join(folder, fname)
            stat = os.stat(fpath)
            backups.append({
                "filename": fname,
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
    backups.sort(key=lambda b: b["created_at"], reverse=True)
    return backups


def run_backup(force: bool = False) -> dict:
    config = get_backup_config()
    if not config["enabled"] and not force:
        return {"skipped": True, "reason": "Los backups automáticos están desactivados"}

    folder = config["destination_path"]
    os.makedirs(folder, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    dest_path = os.path.join(folder, f"{BACKUP_PREFIX}{timestamp}.db")
    shutil.copy2(DB_NAME, dest_path)
    logger.info(f"Backup creado: {dest_path}")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE backup_config SET last_backup_at = ? WHERE id = 1", (datetime.now().isoformat(),))
    conn.commit()
    conn.close()

    _prune_old_backups(folder, config["keep_count"])
    return {"skipped": False, "path": dest_path}


def restore_backup(filename: str) -> dict:
    config = get_backup_config()
    folder = config["destination_path"]
    source_path = os.path.join(folder, filename)

    if not filename.startswith(BACKUP_PREFIX) or not filename.endswith(".db"):
        raise ValueError("Nombre de archivo de backup inválido")
    if not os.path.isfile(source_path):
        raise ValueError("El archivo de backup no existe")

    # Snapshot de seguridad de la base actual antes de sobrescribirla.
    safety = run_backup(force=True)

    shutil.copy2(source_path, DB_NAME)
    logger.info(f"Base de datos restaurada desde: {source_path}")

    return {"restored_from": filename, "safety_backup": safety.get("path")}


def _prune_old_backups(folder: str, keep_count: int):
    backups = sorted(
        (f for f in os.listdir(folder) if f.startswith(BACKUP_PREFIX) and f.endswith(".db")),
        reverse=True,
    )
    for stale in backups[keep_count:]:
        try:
            os.remove(os.path.join(folder, stale))
        except OSError as e:
            logger.warning(f"No se pudo borrar el backup viejo {stale}: {e}")
