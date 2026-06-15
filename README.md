# DentalManager Pro - MVP

Sistema integral de gestión para clínicas odontológicas.

## 🏗️ Arquitectura
El proyecto fue construido siguiendo una arquitectura de capas limpias, aislando completamente la interfaz gráfica de la base de datos:
- **`domain/`**: Contiene la lógica de negocio y las entidades (ej. `Paciente`). Es totalmente agnóstica a la base de datos y a la UI.
- **`persistence/`**: Maneja la conexión a SQLite (`database.py`) y utiliza el Patrón Repository (`paciente_repository.py`) para interactuar con la DB sin exponer código SQL al resto de la aplicación.
- **`ui/`**: Implementación visual con `CustomTkinter`. Llama a los métodos del Repositorio para obtener/guardar datos.
- **`main.py`**: Punto de entrada que inicializa la base de datos, el repositorio y la interfaz gráfica.

## 🚀 Cómo ejecutar el proyecto (Entorno Virtual)

Para evitar conflictos de versiones de librerías entre los miembros del equipo, **siempre** utilicen un Entorno Virtual (`venv`).

### 1. Crear el Entorno Virtual
Abrí una terminal en la carpeta del proyecto y ejecutá:
```powershell
python -m venv venv
```
*(Esto creará una carpeta llamada `venv` que contiene un Python aislado. No debes subir esta carpeta a GitHub).*

### 2. Activar el Entorno Virtual
Dependiendo de tu sistema operativo:
- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Windows (CMD)**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```
- **Mac/Linux**:
  ```bash
  source venv/bin/activate
  ```
*(Sabrás que está activado porque aparecerá `(venv)` al inicio de la línea en tu terminal).*

### 3. Instalar Dependencias
Con el entorno activado, instalá las librerías necesarias:
```powershell
pip install -r requirements.txt
```

### 4. Ejecutar la Aplicación
Finalmente, ejecutá el archivo principal:
```powershell
python main.py
```

---
*Nota: La base de datos `dentalmanager.db` se generará automáticamente la primera vez que se ejecute el programa.*
