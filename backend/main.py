import os
import logging
import traceback
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from persistence.database import init_db, DB_NAME

logging.basicConfig(level=logging.INFO)

# Log de errores a archivo rotativo en la carpeta de la BD — sin loguear el body
# del request para no filtrar datos de pacientes.
error_logger = logging.getLogger("onesmile.errors")
error_logger.setLevel(logging.ERROR)
_log_path = os.path.join(os.path.dirname(os.path.abspath(DB_NAME)), "error.log")
_file_handler = RotatingFileHandler(_log_path, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
_file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
error_logger.addHandler(_file_handler)

from api.patient_router import router as patient_router
from api.appointment_router import router as appointment_router
from api.auth_router import router as auth_router
from api.admin_router import router as admin_router
from api.box_router import router as box_router
from api.box_payment_router import router as box_payment_router
from api.contract_router import router as contract_router
from api.schedule_config_router import router as schedule_config_router
from api.profile_router import router as profile_router
from api.email_router import router as email_router
from api.backup_router import router as backup_router
from api.lab_router import router as lab_router
from api.obra_social_router import router as obra_social_router
from services.scheduler import start_scheduler, stop_scheduler
from services.backup_service import run_backup

app = FastAPI(title="OneSmile API")

# Configuración de CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "http://localhost:3000",
    "app://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.exception_handler(Exception)
async def log_unhandled_exceptions(request: Request, exc: Exception):
    error_logger.error(
        "Error no manejado en %s %s\n%s",
        request.method, request.url.path, traceback.format_exc()
    )
    return JSONResponse(status_code=500, content={"detail": "Ocurrió un error interno. Contactá a soporte si el problema persiste."})

MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_SIZE:
        return JSONResponse(status_code=413, content={"detail": "Request demasiado grande"})
    return await call_next(request)

from uploads_path import UPLOADS_DIR
os.makedirs(os.path.join(UPLOADS_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "patients"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "images"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "labs"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "price-lists"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "obras_sociales"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@app.on_event("startup")
def on_startup():
    init_db()
    try:
        start_scheduler()
    except Exception as e:
        logging.warning(f"Scheduler no pudo iniciar (no afecta el funcionamiento): {e}")
    try:
        run_backup()
    except Exception as e:
        logging.warning(f"Backup inicial falló (no afecta el funcionamiento): {e}")

@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()

app.include_router(patient_router, prefix="/patients", tags=["patients"])
app.include_router(appointment_router, prefix="/appointments", tags=["appointments"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(box_router, prefix="/api/admin/boxes", tags=["boxes"])
app.include_router(box_payment_router, prefix="/api/admin/payments", tags=["payments"])
app.include_router(contract_router, prefix="/api/admin/contracts", tags=["contracts"])
app.include_router(schedule_config_router, prefix="/api/schedule-config", tags=["schedule-config"])
app.include_router(profile_router, prefix="/api/profile", tags=["profile"])
app.include_router(email_router, prefix="/api/email", tags=["email"])
app.include_router(backup_router, prefix="/api/backup", tags=["backup"])
app.include_router(lab_router, prefix="/api/labs", tags=["labs"])
app.include_router(obra_social_router, prefix="/api/obras-sociales", tags=["obras-sociales"])

@app.get("/")
def read_root():
    return {"message": "Welcome to OneSmile API"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("DEV_BACKEND_PORT", os.environ.get("BACKEND_PORT", 8000)))
    uvicorn.run(app, host="127.0.0.1", port=port)
