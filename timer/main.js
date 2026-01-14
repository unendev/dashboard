import { app, BrowserWindow, Tray, Menu, shell, screen, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VITE_DEV_SERVER_URL = 'http://localhost:5173';
const isDev = !app.isPackaged;

let mainWindow = null;
let createWindow = null;
let memoWindow = null;
const taskMemoWindows = new Map();
let todoWindow = null;
let aiWindow = null;
let settingsWindow = null;
let promptLibraryWindow = null;
const projectWindows = new Map();
let tray = null;
let isQuitting = false;

const iconPath = path.join(__dirname, 'icon.ico');

function loadWindow(win, route) {
  if (isDev) {
    win.loadURL(`${VITE_DEV_SERVER_URL}/#${route}`);
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    win.loadFile(indexPath, { hash: route });
  }
}

function attachExternalLinkHandler(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

function createToolWindow(type, existingWindow) {
  if (existingWindow) {
    existingWindow.focus();
    return existingWindow;
  }

  const ses = session.fromPartition('persist:timer-widget');
  const configs = {
    memo: { width: 320, height: 450, title: '备忘录', route: '/memo', alwaysOnTop: true, skipTaskbar: true },
    'task-memo': { width: 320, height: 450, title: '任务备注', route: '/memo?type=task', alwaysOnTop: false, skipTaskbar: false },
    todo: { width: 340, height: 500, title: '项目管理', route: '/todo', alwaysOnTop: true, skipTaskbar: true },
    ai: { width: 360, height: 500, title: 'AI 助手', route: '/ai', alwaysOnTop: true, skipTaskbar: true },
    settings: { width: 300, height: 350, title: '设置', route: '/settings', alwaysOnTop: true, skipTaskbar: true },
    create: { width: 500, height: 600, title: '新建任务', route: '/create', alwaysOnTop: true, skipTaskbar: true },
    promptLibrary: { width: 700, height: 600, title: '提示词库', route: '/prompt-library', alwaysOnTop: false, skipTaskbar: false },
  };
  const config = configs[type];

  let x;
  let y;
  if (mainWindow) {
    const [mainX, mainY] = mainWindow.getPosition();
    x = mainX - config.width - 10;
    y = mainY;
  }

  const win = new BrowserWindow({
    width: config.width,
    height: config.height,
    x,
    y,
    title: config.title,
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a1a',
    alwaysOnTop: config.alwaysOnTop || false,
    resizable: true,
    maximizable: false,
    minWidth: 250,
    minHeight: 200,
    skipTaskbar: config.skipTaskbar ?? true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: ses,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
  });

  win.setMenu(null);
  attachExternalLinkHandler(win);
  loadWindow(win, config.route);

  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; }
      [data-drag="true"] { -webkit-app-region: drag; }
      [data-drag="false"] { -webkit-app-region: no-drag; }
    `);
  });

  return win;
}

function createMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowWidth = 350;
  const windowHeight = 500;

  const ses = session.fromPartition('persist:timer-widget');

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: width - windowWidth - 20, // 20px padding from right
    y: height - windowHeight - 20, // 20px padding from bottom
    icon: iconPath,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true, // Don't show in taskbar, only tray
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: ses,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  loadWindow(mainWindow, '/timer');

  attachExternalLinkHandler(mainWindow);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; }
      [data-drag="true"] { -webkit-app-region: drag; }
      [data-drag="false"] { -webkit-app-region: no-drag; }
    `);
  });

  // Close behavior - Minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(iconPath);
  tray.setToolTip('Project Nexus Timer');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Timer',
      click: () => createMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      createMainWindow();
    }
  });
}

function openCreateWindow() {
  if (createWindow) {
    createWindow.focus();
    return;
  }
  createWindow = createToolWindow('create', null);
  createWindow.on('closed', () => {
    createWindow = null;
  });
}

function openMemoWindow() {
  if (memoWindow) {
    memoWindow.close();
    return;
  }
  memoWindow = createToolWindow('memo', null);
  memoWindow.on('closed', () => {
    memoWindow = null;
  });
}

function openTodoWindow() {
  if (todoWindow) {
    todoWindow.close();
    return;
  }
  todoWindow = createToolWindow('todo', null);
  todoWindow.on('closed', () => {
    todoWindow = null;
  });
}

function openAiWindow() {
  if (aiWindow) {
    aiWindow.close();
    return;
  }
  aiWindow = createToolWindow('ai', null);
  if (isDev) aiWindow.webContents.openDevTools({ mode: 'detach' });
  aiWindow.on('closed', () => {
    aiWindow = null;
  });
}

function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.close();
    return;
  }
  settingsWindow = createToolWindow('settings', null);
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function openPromptLibraryWindow() {
  if (promptLibraryWindow) {
    promptLibraryWindow.close();
    return;
  }
  promptLibraryWindow = createToolWindow('promptLibrary', null);
  if (isDev) promptLibraryWindow.webContents.openDevTools({ mode: 'detach' });
  promptLibraryWindow.on('closed', () => {
    promptLibraryWindow = null;
  });
}

function openTaskMemoWindow(taskId, taskName) {
  if (taskMemoWindows.has(taskId)) {
    const win = taskMemoWindows.get(taskId);
    if (!win.isDestroyed()) {
      win.focus();
      return;
    }
    taskMemoWindows.delete(taskId);
  }

  let x;
  let y;
  if (todoWindow && !todoWindow.isDestroyed()) {
    const [todoX, todoY] = todoWindow.getPosition();
    x = todoX - 320 - 10;
    y = todoY;
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    const [mainX, mainY] = mainWindow.getPosition();
    x = mainX - 320 - 10;
    y = mainY;
  }

  const ses = session.fromPartition('persist:timer-widget');
  const safeName = taskName ? encodeURIComponent(taskName) : '';
  const win = new BrowserWindow({
    width: 320,
    height: 450,
    x,
    y,
    title: '任务备注',
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a1a',
    alwaysOnTop: false,
    resizable: true,
    maximizable: false,
    minWidth: 250,
    minHeight: 200,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: ses,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
  });

  win.setMenu(null);
  attachExternalLinkHandler(win);
  loadWindow(win, `/memo?type=task&id=${taskId}&title=${safeName}`);

  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; }
      [data-drag="true"] { -webkit-app-region: drag; }
      [data-drag="false"] { -webkit-app-region: no-drag; }
    `);
  });

  win.on('closed', () => {
    taskMemoWindows.delete(taskId);
  });

  taskMemoWindows.set(taskId, win);
}

function openProjectWindow(projectId, title) {
  if (projectWindows.has(projectId)) {
    const existingWin = projectWindows.get(projectId);
    if (!existingWin.isDestroyed()) {
      if (existingWin.isMinimized()) existingWin.restore();
      existingWin.show();
      existingWin.focus();
      return;
    }
    projectWindows.delete(projectId);
  }

  const ses = session.fromPartition('persist:timer-widget');
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    title: title || 'Project',
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a1a',
    alwaysOnTop: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: ses,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
  });

  win.setMenu(null);
  attachExternalLinkHandler(win);
  loadWindow(win, `/project/${projectId}`);

  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; }
      [data-drag="true"] { -webkit-app-region: drag; }
      [data-drag="false"] { -webkit-app-region: no-drag; }
    `);
  });

  win.on('closed', () => {
    projectWindows.delete(projectId);
  });

  projectWindows.set(projectId, win);
}

app.whenReady().then(() => {
  createTray();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

ipcMain.on('open-create-window', () => openCreateWindow());
ipcMain.on('open-memo-window', () => openMemoWindow());
ipcMain.on('open-task-memo-window', (event, { taskId, taskName }) => openTaskMemoWindow(taskId, taskName));
ipcMain.on('open-todo-window', () => openTodoWindow());
ipcMain.on('open-ai-window', () => openAiWindow());
ipcMain.on('open-settings-window', () => openSettingsWindow());
ipcMain.on('open-prompt-library-window', () => openPromptLibraryWindow());
ipcMain.on('open-project-window', (event, { projectId, title }) => openProjectWindow(projectId, title));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // We stay active in the tray until explicit Quit
  }
});
