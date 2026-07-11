from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from domain.user import User
from api.dependencies import require_admin
from services.backup_service import get_backup_config, save_backup_config, run_backup, list_backups

router = APIRouter()


class BackupConfigUpdate(BaseModel):
    destination_path: str = ""
    enabled: bool = True
    keep_count: int = 30


@router.get("/config")
def read_config(current_user: User = Depends(require_admin)):
    return get_backup_config()


@router.put("/config")
def update_config(body: BackupConfigUpdate, current_user: User = Depends(require_admin)):
    save_backup_config(body.destination_path, body.enabled, body.keep_count)
    return {"message": "Configuración de backups guardada"}


@router.post("/run")
def trigger_backup(current_user: User = Depends(require_admin)):
    result = run_backup()
    if result.get("skipped"):
        raise HTTPException(status_code=400, detail=result.get("reason", "Backup desactivado"))
    return {"message": "Backup creado correctamente", "path": result["path"]}


@router.get("/list")
def read_backups(current_user: User = Depends(require_admin)):
    return list_backups()
