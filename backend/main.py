from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from persistence.database import init_db
from api.patient_router import router as patient_router
from api.appointment_router import router as appointment_router
from api.auth_router import router as auth_router
from api.admin_router import router as admin_router
from api.box_router import router as box_router
from api.box_payment_router import router as box_payment_router
from api.contract_router import router as contract_router

app = FastAPI(title="DentalManager API")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/")
def read_root():
    return {"message": "Welcome to DentalManager API"}
