import os
import uuid
import smtplib
import threading
from datetime import date
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from domain.user import User
from domain.promotion import Promotion
from api.dependencies import require_admin
from persistence.promotion_repository import PromotionRepository
from persistence.patient_repository import PatientRepository
from services.email_service import check_email_ready, send_promotion_batch
from uploads_path import UPLOADS_DIR

router = APIRouter()

promo_repo = PromotionRepository()
patient_repo = PatientRepository()

PROMOTIONS_DIR = os.path.join(UPLOADS_DIR, "promotions")
os.makedirs(PROMOTIONS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


class PromotionUpdate(BaseModel):
    title: str
    category: str = "General"
    message: Optional[str] = None


class SendRequest(BaseModel):
    # None = todos los pacientes del profesional que tengan mail cargado
    patient_ids: Optional[List[int]] = None


# --- Envios en curso (en memoria: son efimeros, no hace falta persistirlos) ---
_jobs: Dict[str, dict] = {}
_jobs_lock = threading.Lock()
MAX_ERRORS_KEPT = 20


def _abs_path(file_path: str) -> str:
    rel = file_path.lstrip("/")
    if rel.startswith("uploads/"):
        rel = rel[len("uploads/"):]
    return os.path.join(UPLOADS_DIR, rel)


def _remove_file(file_path: Optional[str]):
    if not file_path:
        return
    try:
        path = _abs_path(file_path)
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass


def _own_promotion(promo_id: int, user: User) -> Promotion:
    promo = promo_repo.get_by_id(promo_id)
    if not promo or promo.professional_id != user.id:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    return promo


@router.get("", response_model=List[Promotion])
def list_promotions(current_user: User = Depends(require_admin)):
    return promo_repo.get_by_professional(current_user.id)


@router.get("/recipients")
def list_recipients(current_user: User = Depends(require_admin)):
    """Contactos de todos los pacientes del profesional (para elegir destinatarios y armar la lista de WhatsApp)."""
    return patient_repo.get_contacts(current_user.id)


@router.post("", response_model=Promotion)
def create_promotion(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("General"),
    message: str = Form(""),
    current_user: User = Depends(require_admin),
):
    if not title.strip():
        raise HTTPException(status_code=400, detail="El título es obligatorio")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG, PNG o WEBP")
    content = file.file.read(MAX_IMAGE_SIZE + 1)
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande. Máximo 10MB")

    filename = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(PROMOTIONS_DIR, filename), "wb") as f:
        f.write(content)

    promo = Promotion(
        professional_id=current_user.id,
        title=title.strip(),
        category=category.strip() or "General",
        message=message.strip() or None,
        file_path=f"/uploads/promotions/{filename}",
        created_at=str(date.today()),
    )
    return promo_repo.insert(promo)


@router.put("/{promo_id}", response_model=Promotion)
def update_promotion(promo_id: int, body: PromotionUpdate, current_user: User = Depends(require_admin)):
    _own_promotion(promo_id, current_user)
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="El título es obligatorio")
    promo_repo.update(promo_id, body.title.strip(), body.category.strip() or "General", (body.message or "").strip() or None)
    return promo_repo.get_by_id(promo_id)


@router.delete("/{promo_id}")
def delete_promotion(promo_id: int, current_user: User = Depends(require_admin)):
    promo = _own_promotion(promo_id, current_user)
    promo_repo.delete(promo_id)
    _remove_file(promo.file_path)
    return {"message": "Promoción eliminada"}


def _run_send_job(job_id: str, recipients: List[tuple], subject: str, message: str, image_bytes: bytes, ext: str):
    job = _jobs[job_id]

    def on_result(email: str, ok: bool, msg: str):
        with _jobs_lock:
            if ok:
                job["sent"] += 1
            else:
                job["failed"] += 1
                if len(job["errors"]) < MAX_ERRORS_KEPT:
                    job["errors"].append(f"{email}: {msg}")

    try:
        send_promotion_batch(recipients, subject, message, image_bytes, ext, on_result)
    except Exception as e:
        # Fallo global (ej: credenciales SMTP incorrectas): ningun mail salio.
        if isinstance(e, smtplib.SMTPAuthenticationError):
            friendly = "Credenciales SMTP incorrectas. Para Gmail usá una App Password, no tu contraseña normal."
        elif isinstance(e, (smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError)):
            friendly = "El servidor de correo cortó la conexión. Verificá el usuario/contraseña en Recordatorios o probá más tarde."
        elif isinstance(e, OSError):
            # Sin internet / DNS / timeout: el texto crudo de Windows no le dice nada al usuario.
            friendly = "No se pudo conectar al servidor de correo. Verificá tu conexión a internet y probá de nuevo."
        else:
            friendly = str(e)
        with _jobs_lock:
            job["error"] = friendly
    finally:
        with _jobs_lock:
            job["done"] = True


@router.post("/{promo_id}/send-email")
def send_promotion_email(promo_id: int, body: SendRequest, current_user: User = Depends(require_admin)):
    promo = _own_promotion(promo_id, current_user)

    not_ready = check_email_ready()
    if not_ready:
        raise HTTPException(status_code=400, detail=not_ready)

    with _jobs_lock:
        if any(not j["done"] for j in _jobs.values()):
            raise HTTPException(status_code=409, detail="Ya hay un envío en curso. Esperá a que termine.")

    contacts = patient_repo.get_contacts(current_user.id)
    if body.patient_ids is not None:
        wanted = set(body.patient_ids)
        contacts = [c for c in contacts if c["id"] in wanted]
    with_email = [c for c in contacts if "@" in c["email"]]
    skipped = len(contacts) - len(with_email)
    if not with_email:
        raise HTTPException(status_code=400, detail="Ninguno de los pacientes elegidos tiene email cargado.")

    path = _abs_path(promo.file_path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No se encontró el archivo de la imagen")
    with open(path, "rb") as f:
        image_bytes = f.read()
    ext = os.path.splitext(path)[1]

    job_id = uuid.uuid4().hex
    with _jobs_lock:
        # Se descartan los envios viejos ya terminados para que el dict no crezca.
        for old_id in [k for k, v in _jobs.items() if v["done"]]:
            del _jobs[old_id]
        _jobs[job_id] = {"total": len(with_email), "sent": 0, "failed": 0, "done": False, "error": None, "errors": []}

    recipients = [(c["name"], c["email"]) for c in with_email]
    threading.Thread(
        target=_run_send_job,
        args=(job_id, recipients, promo.title, promo.message or "", image_bytes, ext),
        daemon=True,
    ).start()
    return {"job_id": job_id, "total": len(with_email), "skipped_no_email": skipped}


@router.get("/jobs/{job_id}")
def get_send_job(job_id: str, current_user: User = Depends(require_admin)):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Envío no encontrado")
        return dict(job)
