const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

let mainWindow = null;
let pythonProcess = null;

const PORT = 8800;
const SERVER_URL = `http://127.0.0.1:${PORT}`;
const ARGUS_IPC_TOKEN = crypto.randomBytes(32).toString('hex');

function getRootDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }
  return path.join(__dirname, '..');
}

function findPythonCommand(rootDir) {
  const isWin = process.platform === 'win32';
  const candidates = [
    // 1. Workspace virtualenv
    path.join(process.env.HOME || '', 'Antigravity', 'argus', '.venv', 'bin', 'python3'),
    // 2. Relative to rootDir
    isWin ? path.join(rootDir, '.venv', 'Scripts', 'python.exe') : path.join(rootDir, '.venv', 'bin', 'python3'),
    // 3. User local / Framework Python
    '/Library/Frameworks/Python.framework/Versions/3.14/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
    // 4. Homebrew
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
    // 5. System fallback
    isWin ? 'python' : 'python3'
  ];

  for (const cand of candidates) {
    if (cand.includes(path.sep)) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
  }
  return isWin ? 'python' : 'python3';
}

function startPythonBackend() {
  const isWin = process.platform === 'win32';
  const rootDir = getRootDir();
  const pythonCmd = findPythonCommand(rootDir);

  console.log(`[ARGUS] Spawning Python backend via: ${pythonCmd} in ${rootDir}`);

  try {
    pythonProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', `${PORT}`], {
      cwd: rootDir,
      env: {
        ...process.env,
        PYTHONPATH: rootDir,
        PYTHONUNBUFFERED: '1',
        ARGUS_IPC_TOKEN: ARGUS_IPC_TOKEN
      },
      detached: !isWin // Enables PGID management on POSIX
    });

    if (pythonProcess.stdout) {
      pythonProcess.stdout.on('data', (data) => {
        console.log(`[Backend] ${data.toString().trim()}`);
      });
    }

    if (pythonProcess.stderr) {
      pythonProcess.stderr.on('data', (data) => {
        console.error(`[Backend Log] ${data.toString().trim()}`);
      });
    }

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python backend:', err);
    });
  } catch (err) {
    console.error('Exception spawning Python backend:', err);
  }
}

function waitForServer(callback, retries = 30) {
  http.get(`${SERVER_URL}/api/health`, (res) => {
    if (res.statusCode === 200) {
      callback();
    } else {
      retry();
    }
  }).on('error', () => {
    retry();
  });

  function retry() {
    if (retries > 0) {
      setTimeout(() => waitForServer(callback, retries - 1), 500);
    } else {
      console.error('Backend server startup timeout.');
      createWindow(); // Open anyway
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'ARGUS // Tactical Intelligence & Defense',
    backgroundColor: '#0a0e15',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Security: block opening new windows inside Electron; delegate to default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security: prevent in-window navigation away from local ARGUS cockpit
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(SERVER_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      window.__ARGUS_IPC_TOKEN__ = "${ARGUS_IPC_TOKEN}";
    `).catch(() => {});
  });

  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(SERVER_URL).catch(() => {});
      }
    }, 1000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function stopPythonBackend() {
  if (!pythonProcess || pythonProcess.killed) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', pythonProcess.pid.toString(), '/f', '/t']);
    } else {
      process.kill(-pythonProcess.pid, 'SIGTERM'); // Kill entire process group
    }
  } catch (e) {
    try { pythonProcess.kill('SIGKILL'); } catch (_) {}
  }
}

app.whenReady().then(() => {
  startPythonBackend();
  waitForServer(() => {
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', stopPythonBackend);
app.on('will-quit', stopPythonBackend);
