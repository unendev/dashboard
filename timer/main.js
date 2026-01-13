import { app, BrowserWindow, screen, globalShortcut, session, ipcMain, Menu, Tray, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 设置日志文件路径
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, `electron-${new Date().toISOString().split('T')[0]}.log`);

// 日志函数：同时写入文件和控制台
function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // 写入文件
  try {
    fs.appendFileSync(logFilePath, logMessage);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
  
  // 写入控制台
  console.log(message);
}

app.disableHardwareAcceleration();
Menu.setApplicationMenu(null);

// 如果未打包且 NODE_ENV 不为 'production'，则视为开发模式
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

// API 地址：根据是否打包自动切换
// 打包后 (app.isPackaged = true) → 使用 Vercel 生产环境
// 开发中 (app.isPackaged = false) → 使用本地 localhost
const API_BASE_URL = app.isPackaged
  ? 'https://dashboard.unendev.com'
  : 'http://localhost:10000';

process.on('uncaughtException', (error) => {
  console.error('[Main Process] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main Process] Unhandled Rejection:', reason);
});

// 内存中缓存 Cookie，用于手动注入 (已废弃，保留变量防止引用报错，可后续删除)
let cachedSessionCookie = '';

app.on('ready', () => {
  const ses = session.fromPartition('persist:timer-widget');
  // 已移除 Cookie 拦截器，改用纯 Token 认证方案
  console.log('[Main Process] Ready (Token Auth Mode)');
});

const windowStatePath = () => path.join(app.getPath('userData'), 'timer-window-state.json');

const isValidNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const loadWindowState = (defaults) => {
  try {
    if (!fs.existsSync(windowStatePath())) return defaults;
    const raw = fs.readFileSync(windowStatePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || !isValidNumber(parsed.width) || !isValidNumber(parsed.height)) return defaults;
    return { width: parsed.width, height: parsed.height, x: parsed.x, y: parsed.y };
  } catch (error) {
    return defaults;
  }
};

const saveWindowState = (win) => {
  if (!win || win.isDestroyed()) return;
  try {
    const { width, height, x, y } = win.getBounds();
    fs.writeFileSync(windowStatePath(), JSON.stringify({ width, height, x, y }));
  } catch (error) { }
};

const normalizeBounds = (bounds, minWidth, minHeight) => {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.max(bounds.width || minWidth, minWidth);
  const height = Math.max(bounds.height || minHeight, minHeight);
  const x = clamp(isValidNumber(bounds.x) ? bounds.x : sw - width - 50, 0, Math.max(0, sw - width));
  const y = clamp(isValidNumber(bounds.y) ? bounds.y : 50, 0, Math.max(0, sh - height));
  return { width, height, x, y };
};

function loadWindow(win, route) {
  if (isDev) {
    win.loadURL(`${VITE_DEV_SERVER_URL}/#${route}`);
  } else {
    // 强制使用绝对路径确保生产模式下能找到 index.html
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log(`[Main Process] Loading window with path: ${indexPath}, hash: ${route}`);
    if (fs.existsSync(indexPath)) {
      win.loadFile(indexPath, { hash: route });
    } else {
      // 兼容直接在项目根目录运行的情况
      const fallbackPath = path.join(__dirname, 'index.html');
      console.log(`[Main Process] Falling back to path: ${fallbackPath}`);
      win.loadFile(fallbackPath, { hash: route });
    }
  }
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
  console.log(`[Main] Creating window type: ${type}`, config);

  let x, y;
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
      webSecurity: false, // 允许本地文件处理 Cookie 和跨域
    },
  });

  win.setMenu(null);

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  loadWindow(win, config.route);

  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; }
      [data-drag="true"] { -webkit-app-region: drag; }
      [data-drag="false"] { -webkit-app-region: no-drag; }
    `);
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Main Process] ${type} window failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
  });

  return win;
}

let mainWindow;
let createWindow;
let memoWindow;
const taskMemoWindows = new Map(); // Map<taskId, BrowserWindow>
let todoWindow;
let aiWindow;
let settingsWindow;
let promptLibraryWindow;
let tray = null;
let isQuitting = false;

function createMainWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 300;
  const windowHeight = 200;
  const ses = session.fromPartition('persist:timer-widget');
  const defaultBounds = {
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - 50,
    y: 50,
  };
  const savedBounds = normalizeBounds(loadWindowState(defaultBounds), 200, 100);
  const { width, height, x, y } = savedBounds;

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a1a',
    alwaysOnTop: true,
    resizable: true,
    maximizable: false,
    minWidth: 200,
    minHeight: 100,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: ses,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    if (openUrl.includes('#/create')) { openCreateWindow(); return { action: 'deny' }; }
    if (openUrl.includes('#/memo')) { openMemoWindow(); return { action: 'deny' }; }
    if (openUrl.includes('#/todo')) { openTodoWindow(); return { action: 'deny' }; }
    if (openUrl.includes('#/settings')) { openSettingsWindow(); return { action: 'deny' }; }
    if (openUrl.includes('#/ai')) { openAiWindow(); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  loadWindow(mainWindow, '/timer');

  mainWindow.webContents.on('did-navigate', (_event, url) => {
    if (url.includes('#/login')) {
      mainWindow.setSize(320, 420);
      mainWindow.center();
    } else if (url.includes('#/timer')) {
      const [w, h] = mainWindow.getSize();
      if (w === 320 && h === 420) {
        const restored = normalizeBounds(loadWindowState(defaultBounds), 200, 100);
        mainWindow.setBounds(restored);
      }
    }
  });

  mainWindow.webContents.on('did-start-navigation', (event, url) => {
    console.log(`[Main Process] Started navigation to: ${url}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Main Process] Failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
      [data-drag="true"] { -webkit-app-region: drag !important; }
      [data-drag="false"] { -webkit-app-region: no-drag !important; }
    `);
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  let saveTimeout;
  const scheduleSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveWindowState(mainWindow), 200);
  };

  mainWindow.on('resize', scheduleSave);
  mainWindow.on('move', scheduleSave);
  mainWindow.on('close', () => saveWindowState(mainWindow));

  mainWindow.on('focus', () => {
    globalShortcut.register('F5', () => mainWindow.reload());
    globalShortcut.register('CommandOrControl+Shift+I', () => mainWindow.webContents.toggleDevTools());
  });

  mainWindow.on('blur', () => {
    globalShortcut.unregister('F5');
    globalShortcut.unregister('CommandOrControl+Shift+I');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    globalShortcut.unregisterAll();
  });
}

app.on('ready', () => {
  const ses = session.fromPartition('persist:timer-widget');
  // ses.clearCache().then(() => {
  //   setTimeout(createMainWindow, 300);
  // });
  setTimeout(createMainWindow, 300);

  // Create Tray
  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);
  tray.setToolTip('Timer Widget');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口 (Show)',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出 (Exit)',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.minimize(); // Optional: Click to minimize if focused? Or just focus?
          // User said "Just need to show in tray".
          // Standard toggle behavior: If visible and focused -> Minimize? Or just nothing?
          // Let's keep it simple: Show/Focus.
          mainWindow.focus();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createMainWindow();
    }
  });
});

function openCreateWindow() {
  if (createWindow) { createWindow.focus(); return; }
  createWindow = createToolWindow('create', null);
  createWindow.on('closed', () => {
    createWindow = null;
    // Removed reload here to avoid interrupting IPC/Storage logic
    // If we use IPC, the TimerPage will update itself anyway.
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

  // Calculate position: Left of Todo Window
  let x, y;
  const safeName = taskName ? encodeURIComponent(taskName) : '';
  const config = { width: 320, height: 450, title: '任务备注', route: `/memo?type=task&id=${taskId}&title=${safeName}`, alwaysOnTop: false, skipTaskbar: false };

  if (todoWindow && !todoWindow.isDestroyed()) {
    const [todoX, todoY] = todoWindow.getPosition();
    x = todoX - config.width - 10; // 10px spacing
    y = todoY;
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    // Fallback to main window
    const [mainX, mainY] = mainWindow.getPosition();
    x = mainX - config.width - 10;
    y = mainY;
  }

  // Note: We can't reuse createToolWindow easily because of position override and unique route. 
  // But wait, createToolWindow calculates position based on main window. 
  // Let's modify createToolWindow or manually create here. 
  // To stick to pattern, let's manually create to override position logic specifically.

  const ses = session.fromPartition('persist:timer-widget');
  const win = new BrowserWindow({
    width: config.width,
    height: config.height,
    x, y,
    title: config.title,
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
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  loadWindow(win, config.route);

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

function openTodoWindow() {
  if (todoWindow) {
    todoWindow.close();
    // todoWindow = null; // Handled by 'closed' event, but explicit is fine
    return;
  }
  todoWindow = createToolWindow('todo', null);
  todoWindow.on('closed', () => { todoWindow = null; });
}

function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.close();
    return;
  }
  settingsWindow = createToolWindow('settings', null);
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

function openAiWindow() {
  if (aiWindow) {
    aiWindow.close();
    return;
  }
  aiWindow = createToolWindow('ai', null);
  if (isDev) aiWindow.webContents.openDevTools({ mode: 'detach' });
  aiWindow.on('closed', () => { aiWindow = null; });
}

// Added toggle logic for Memo as well
function openMemoWindow() {
  if (memoWindow) {
    memoWindow.close();
    return;
  }
  memoWindow = createToolWindow('memo', null);
  memoWindow.on('closed', () => { memoWindow = null; });
}

function openPromptLibraryWindow() {
  if (promptLibraryWindow) {
    promptLibraryWindow.close();
    return;
  }
  promptLibraryWindow = createToolWindow('promptLibrary', null);
  if (isDev) promptLibraryWindow.webContents.openDevTools({ mode: 'detach' });
  promptLibraryWindow.on('closed', () => { promptLibraryWindow = null; });
}

ipcMain.on('open-create-window', () => openCreateWindow());
// ipcMain.on('open-create-window', () => openCreateWindow()); // Duplicate removed
ipcMain.on('open-memo-window', () => openMemoWindow());
ipcMain.on('open-task-memo-window', (event, { taskId, taskName }) => openTaskMemoWindow(taskId, taskName));
ipcMain.on('open-todo-window', () => openTodoWindow());
ipcMain.on('open-ai-window', () => openAiWindow());
ipcMain.on('open-settings-window', () => openSettingsWindow());
ipcMain.on('open-prompt-library-window', () => openPromptLibraryWindow());

const projectWindows = new Map(); // Map<projectId, BrowserWindow>

ipcMain.on('open-project-window', (event, { projectId, title }) => {
  console.log(`[Main] Request open project window: ${projectId}`);

  if (projectWindows.has(projectId)) {
    const existingWin = projectWindows.get(projectId);
    if (!existingWin.isDestroyed()) {
      console.log(`[Main] Focusing existing window for ${projectId}`);
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

  const url = isDev
    ? `http://localhost:5173/#/project/${projectId}`
    : `file://${path.join(__dirname, 'dist/index.html')}#/project/${projectId}`;

  win.loadURL(url);

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
});

// Handle task creation IPC from Create window to Main window
ipcMain.on('start-task', (event, taskData) => {
  console.log('[Main Process] Received start-task:', taskData.name);
  if (mainWindow) {
    mainWindow.webContents.send('on-start-task', taskData);
  }
});

// Helper to log to both stdout and renderer console
function logToCombined(type, ...args) {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
  const prefix = type === 'error' ? '❌' : 'ℹ️';
  const fullMessage = `${prefix} ${message}`;

  // 1. 写入日志文件
  writeLog(fullMessage);

  // 2. Send to Renderer
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('on-console-log', { type, message: fullMessage });
  }
}

// Handle AI task creation from Create window (Fire and Forget)
ipcMain.on('ai-create-task', async (event, { text, userId, autoStart }) => {
  logToCombined('info', '🤖 [Main Process] Received ai-create-task:', text, 'UserID:', userId);

  try {
    const apiUrl = `${API_BASE_URL}/api/timer-tasks/parse`;
    logToCombined('info', '📡 [Main Process] API_BASE_URL:', API_BASE_URL);
    logToCombined('info', '📡 [Main Process] Full API URL:', apiUrl);

    const headers = {
      'Content-Type': 'application/json'
    };

    logToCombined('info', '📡 [Main Process] Request headers:', JSON.stringify(headers));
    logToCombined('info', '📡 [Main Process] Request body:', JSON.stringify({ text }));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    });

    logToCombined('info', '📡 [Main Process] Response Status:', response.status);
    logToCombined('info', '📡 [Main Process] Response Headers:', JSON.stringify(Object.fromEntries(response.headers)));

    if (!response.ok) {
      const errorText = await response.text();
      logToCombined('error', '❌ [Main Process] AI API Error:', response.status, errorText);
      logToCombined('error', '❌ [Main Process] Full error response:', errorText);
      return;
    }

    const parsed = await response.json();
    logToCombined('info', '✅ [Main Process] AI Parsed Result:', JSON.stringify(parsed, null, 2));
    logToCombined('info', '✅ [Main Process] Parsed categoryPath:', parsed.categoryPath);
    logToCombined('info', '✅ [Main Process] Parsed name:', parsed.name);
    logToCombined('info', '✅ [Main Process] Parsed instanceTags:', JSON.stringify(parsed.instanceTags));

    if (mainWindow) {
      if (mainWindow.isDestroyed()) {
        logToCombined('error', '❌ [Main Process] mainWindow is destroyed!');
        return;
      }

      const taskData = {
        name: parsed.name,
        userId: userId || 'user-1',
        categoryPath: parsed.categoryPath,
        date: new Date().toISOString().split('T')[0],
        initialTime: parsed.duration ? parsed.duration * 60 : 0,
        instanceTagNames: parsed.instanceTags || [],
        timestamp: Date.now(),
        autoStart: autoStart
      };

      logToCombined('info', '🚀 [Main Process] Sending on-start-task to mainWindow with data:', JSON.stringify(taskData, null, 2));
      mainWindow.webContents.send('on-start-task', taskData);
    } else {
      logToCombined('error', '❌ [Main Process] mainWindow is null!');
    }

  } catch (error) {
    logToCombined('error', '❌ [Main Process] AI Processing Exception:', error.message);
    logToCombined('error', '❌ [Main Process] Stack:', error.stack);
  }
});

// 工具栏右键菜单
ipcMain.on('show-toolbar-context-menu', (event) => {
  const template = [
    {
      label: '📚 提示词库',
      click: () => {
        openPromptLibraryWindow();
      }
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createMainWindow();
});
