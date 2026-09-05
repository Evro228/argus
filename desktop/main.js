const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;

const PORT = 8800;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

function startPythonBackend() {
  const isWin = process.platform === 'win32';
  const venvPython = isWin
    ? path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe')
    : path.join(__dirname, '..', '.venv', 'bin', 'python3');

  const pythonCmd = require('fs').existsSync(venvPython) ? venvPython : (isWin ? 'python' : 'python3');

  pythonProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', `${PORT}`], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PYTHONPATH: path.join(__dirname, '..') }
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
      contextIsolation: true
    }
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

app.on('will-quit', () => {
  if (pythonProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
      } else {
        pythonProcess.kill('SIGINT');
      }
    } catch (e) {}
  }
});
