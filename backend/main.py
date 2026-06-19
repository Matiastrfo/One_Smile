import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from persistence.database import init_db

logging.basicConfig(level=logging.INFO)
from api.patient_router import router as patient_router
from api.appointment_router import router as appointment_router
from api.auth_router import router as auth_router
from api.admin_router import router as admin_router
from api.box_router import router as box_router
from api.box_payment_router import router as box_payment_router
from api.contract_router import router as contract_router
from api.schedule_config_router import router as schedule_config_router
from api.profile_router import router as profile_router

app = FastAPI(title="DentalManager API")

# Configuración de CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",
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

MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_SIZE:
        return JSONResponse(status_code=413, content={"detail": "Request demasiado grande"})
    return await call_next(request)

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(os.path.join(UPLOADS_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "patients"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(patient_router, prefix="/patients", tags=["patients"])
app.include_router(appointment_router, prefix="/appointments", tags=["appointments"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(box_router, prefix="/api/admin/boxes", tags=["boxes"])
app.include_router(box_payment_router, prefix="/api/admin/payments", tags=["payments"])
app.include_router(contract_router, prefix="/api/admin/contracts", tags=["contracts"])
app.include_router(schedule_config_router, prefix="/api/schedule-config", tags=["schedule-config"])
app.include_router(profile_router, prefix="/api/profile", tags=["profile"])

@app.get("/")
def read_root():
    return {"message": "Welcome to DentalManager API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
