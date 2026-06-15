# ──────────────────────────────────────────────
# Dental Manager – Backend (FastAPI + Uvicorn)
# ──────────────────────────────────────────────
FROM python:3.11-slim

# Evitar que Python genere archivos .pyc y forzar stdout/stderr sin buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copiar e instalar dependencias primero (cache de capas de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente del backend
COPY backend/ .

# Puerto por defecto de uvicorn
EXPOSE 8000

# Comando de inicio – con --host 0.0.0.0 para escuchar fuera del contenedor
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
