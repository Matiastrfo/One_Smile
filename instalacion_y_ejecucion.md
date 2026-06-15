# DentalManager Pro - Instalación y Ejecución

Esta aplicación consta de dos partes: un backend desarrollado en Python con **FastAPI** y un frontend desarrollado en **React** con **Vite**.

A continuación se detallan los requisitos y los pasos para poner en marcha el proyecto localmente.

## Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu sistema:
1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) *(recomendado para el backend)*
2. [Node.js 18 o superior](https://nodejs.org/es/) (incluye `npm`, para el frontend)
3. [Python 3.9 o superior](https://www.python.org/downloads/) *(solo si no usas Docker)*

---

## 1. Configuración y Ejecución del Backend

### Opción A: Con Docker (Recomendado) 🐳

La forma más rápida y sin problemas de versiones. Solo necesitas tener **Docker Desktop** corriendo.

**Paso 1:** Abre una terminal en la carpeta raíz del proyecto.
```powershell
cd dental-manager-prod
```

**Paso 2:** Levanta el backend con Docker Compose.
```powershell
docker compose up --build
```

¡Listo! El backend estará disponible en `http://localhost:8000`.
- Documentación interactiva: `http://localhost:8000/docs`
- El código tiene **hot-reload**: los cambios en `backend/` se reflejan automáticamente.
- Para detener el contenedor: `Ctrl+C` o `docker compose down`.

---

### Opción B: Sin Docker (Instalación manual)

El backend expone la API REST y se comunica con la base de datos SQLite.

**Paso 1:** Abre una terminal y navega a la carpeta principal del proyecto.
```powershell
cd dental-manager-prod
```

**Paso 2:** Crea un entorno virtual (si no existe).
```powershell
python -m venv venv
```

**Paso 3:** Activa el entorno virtual.
- En **Windows** (PowerShell):
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- En **Linux/macOS**:
  ```bash
  source venv/bin/activate
  ```

**Paso 4:** Instala las dependencias del backend.
```powershell
pip install -r requirements.txt
```

**Paso 5:** Inicia el servidor de desarrollo.
Navega a la carpeta `backend/` y levanta el servidor con `uvicorn`.
```powershell
cd backend
uvicorn main:app --reload
```

El backend estará disponible en `http://localhost:8000`. 
*(Puedes consultar la documentación interactiva de la API ingresando a `http://localhost:8000/docs`).*

---

## 2. Configuración y Ejecución del Frontend (React + Vite)

El frontend es una aplicación de una sola página (SPA) y PWA (Progressive Web App).

**Paso 1:** Abre una **nueva** ventana de terminal (para no cerrar el servidor del backend) y navega a la carpeta del frontend.
```powershell
cd dental-manager-prod\frontend
```

**Paso 2:** Instala las dependencias de Node.js.
```powershell
npm install
```

**Paso 3:** Inicia el servidor de desarrollo de Vite.
```powershell
npm run dev
```

El frontend estará disponible en `http://localhost:5173`. Abre este enlace en tu navegador para comenzar a utilizar el sistema de gestión.

---

## Notas Adicionales
- La base de datos SQLite (`dentalmanager.db`) se creará y gestionará automáticamente en la carpeta `backend/`.
- Todos los archivos pesados, bases de datos locales y dependencias (como `node_modules` o `venv`) están correctamente excluidos del repositorio gracias al archivo `.gitignore`.
