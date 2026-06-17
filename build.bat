@echo off
echo ========================================
echo   ONE Smile — Build de escritorio
echo ========================================

echo.
echo [1/3] Empaquetando backend con PyInstaller...
cd backend
call ..\venv\Scripts\activate
pip install pyinstaller --quiet
pyinstaller backend.spec --distpath ..\backend-dist --workpath ..\build-tmp\backend --noconfirm
cd ..

echo.
echo [2/3] Compilando frontend...
cd frontend
call npm run build
cd ..

echo.
echo [3/3] Generando instalador con electron-builder...
cd frontend
call npx electron-builder
cd ..

echo.
echo ========================================
echo   Listo! Instalador en: dist-electron\
echo ========================================
pause
