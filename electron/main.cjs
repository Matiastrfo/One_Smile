const { app, BrowserWindow, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
let autoUpdater, log;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  log = require('electron-log');
} catch {
  autoUpdater = null;
  log = null;
}

// Registrar protocolo app:// ANTES de que la app esté lista
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

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
    icon: path.join(__dirname, '..', 'frontend', 'src', 'assets', 'logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('app://localhost/index.html');
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────
let progressWindow = null;

function createProgressWindow() {
  progressWindow = new BrowserWindow({
    width: 420,
    height: 180,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    title: 'Actualizando ONE Smile',
    parent: mainWindow,
    modal: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
  });

  progressWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0f172a; color: #f1f5f9;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100vh; gap: 16px; padding: 24px;
          user-select: none;
        }
        h3 { font-size: 15px; font-weight: 600; color: #e2e8f0; }
        p { font-size: 12px; color: #94a3b8; }
        .bar-wrap {
          width: 100%; height: 10px; background: #1e293b;
          border-radius: 99px; overflow: hidden;
        }
        .bar {
          height: 100%; width: 0%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 99px;
          transition: width 0.3s ease;
        }
        .pct { font-size: 13px; font-weight: 600; color: #818cf8; }
      </style>
    </head>
    <body>
      <h3>Descargando actualización...</h3>
      <div class="bar-wrap"><div class="bar" id="bar"></div></div>
      <div class="pct" id="pct">0%</div>
      <p id="speed"></p>
    </body>
    </html>
  `));
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    if (progressWindow && !progressWindow.isDestroyed()) progressWindow.close();
    mainWindow.setProgressBar(-1);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Error al actualizar',
      message: 'No se pudo completar la actualización.',
      detail: err?.message || String(err),
      buttons: ['Cerrar'],
    });
  });

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización disponible',
      message: 'Hay una nueva versión de ONE Smile disponible. ¿Descargar ahora?',
      buttons: ['Descargar', 'Más tarde'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        createProgressWindow();
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.floor(progress.percent);
    const mbps = (progress.bytesPerSecond / 1024 / 1024).toFixed(1);
    mainWindow.setProgressBar(progress.percent / 100);
    if (progressWindow && !progressWindow.isDestroyed()) {
      progressWindow.webContents.executeJavaScript(`
        document.getElementById('bar').style.width = '${percent}%';
        document.getElementById('pct').textContent = '${percent}%';
        document.getElementById('speed').textContent = '${mbps} MB/s';
      `).catch(() => {});
    }
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.setProgressBar(-1);
    if (progressWindow && !progressWindow.isDestroyed()) progressWindow.close();
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización lista',
      message: 'La actualización fue descargada. La aplicación se reiniciará para instalarla.',
      buttons: ['Reiniciar ahora'],
    }).then(() => {
      if (backendProcess) backendProcess.kill();
      autoUpdater.quitAndInstall(true, true);
    });
  });

  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(async () => {
  // Protocolo app:// para habilitar el gestor de contraseñas de Chromium
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app://localhost/', '').split('?')[0].split('#')[0];
    const filePath = url
      ? path.join(__dirname, '..', 'dist', url)
      : path.join(__dirname, '..', 'dist', 'index.html');
    // Si el archivo no existe (rutas SPA), servir index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      callback({ path: path.join(__dirname, '..', 'dist', 'index.html') });
    } else {
      callback({ path: filePath });
    }
  });

  startBackend();
  try {
    await waitForBackend();
    createWindow();
    if (!isDev && autoUpdater) setupAutoUpdater();
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
