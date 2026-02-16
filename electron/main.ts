import { app, BrowserWindow, Menu } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we're in development or production
const isDev = !app.isPackaged;

// Port configuration
const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

/**
 * Start the Express server as a child process
 */
function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Path to the compiled server
    const serverScript = isDev
      ? path.join(__dirname, '../dist/index.js')
      : path.join(process.resourcesPath, 'app', 'dist', 'index.js');

    console.log('[Electron] Starting Express server:', serverScript);

    // Spawn the server process
    serverProcess = spawn('node', [serverScript], {
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: String(PORT),
        ELECTRON_MODE: 'true', // Signal to server it's running in Electron
      },
    });

    // Pipe server output to console
    serverProcess.stdout?.on('data', (data) => {
      console.log('[Server]', data.toString().trim());
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('[Server Error]', data.toString().trim());
    });

    serverProcess.on('close', (code) => {
      console.log(`[Electron] Server process exited with code ${code}`);
    });

    // Wait for server to be ready
    waitOn({
      resources: [SERVER_URL],
      timeout: 15000, // 15 seconds
      interval: 100,
    })
      .then(() => {
        console.log('[Electron] Server is ready');
        resolve();
      })
      .catch((err: Error) => {
        console.error('[Electron] Server failed to start:', err);
        reject(err);
      });
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS native titlebar
    trafficLightPosition: { x: 20, y: 20 }, // Position of red/yellow/green buttons
    backgroundColor: '#f5f5f7', // Matches UI background
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the Express server UI
  mainWindow.loadURL(SERVER_URL);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

/**
 * Create native macOS menu
 */
function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Quit the server when app quits
 */
function stopServer() {
  if (serverProcess) {
    console.log('[Electron] Stopping Express server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// App lifecycle events
app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (error) {
    console.error('[Electron] Failed to start:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running unless explicitly quit
  if (process.platform !== 'darwin') {
    stopServer();
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon clicked
  if (mainWindow === null && serverProcess !== null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught exception:', error);
  stopServer();
  app.quit();
});
