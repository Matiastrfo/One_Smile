const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const isDev = !app.isPackaged;
const BACKEND_PORT = 8000;
let backendProcess = null;
let mainWindow = null;

// ── Iniciar el backend ────────────────────────────────────────────────
function startBackend() {
  if (isDev) {
    // En desarrollo: levanta uvicorn directamente
    const venvPython = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe');
    backendProcess = spawn(venvPython, ['-m', 'uvicorn', 'main:app', '--port', String(BACKEND_PORT)], {
      cwd: path.join(__dirname, '..', 'backend'),
      env: { ...process.env, DB_PATH: getDbPath() },
    });
  } else {
    // En producción: usa el exe generado por PyInstaller
    const backendExe = path.join(process.resourcesPath, 'backend', 'backend.exe');
    backendProcess = spawn(backendExe, [], {
      env: { ...process.env, DB_PATH: getDbPath() },
    });
  }

  backendProcess.stdout?.on('data', d => console.log('[backend]', d.toString()));
  backendProcess.stderr?.on('data', d => console.error('[backend]', d.toString()));
  backendProcess.on('error', err => console.error('[backend] Error al iniciar:', err));
}

// DB en AppData para que persista entre actualizaciones
function getDbPath() {
  return path.join(app.getPath('userData'), 'dentalmanager.db');
}

// ── Esperar a que el backend esté listo ──────────────────────────────
function waitForBackend(retries = 30) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http.get(`http://localhost:${BACKEND_PORT}/`, (res) => {
        if (res.statusCode === 200) resolve();
        else if (n > 0) setTimeout(() => attempt(n - 1), 500);
        else reject(new Error('Backend no respondió'));
      }).on('error', () => {
        if (n > 0) setTimeout(() => attempt(n - 1), 500);
        else reject(new Error('Backend no respondió'));
      });
    };
    attempt(retries);
  });
}

// ── Crear la ventana ─────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ONE Smile',
    icon: path.join(__dirname, '..', 'frontend', 'src', 'assets', 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  startBackend();
  try {
    await waitForBackend();
    createWindow();
  } catch {
    dialog.showErrorBox('Error', 'No se pudo iniciar el servidor. Cerrando la aplicación.');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
