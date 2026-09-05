const electron = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 检查是否在 Electron 环境中运行
if (typeof electron === 'string') {
  console.error('ERROR: require("electron") returned a string instead of the Electron API.');
  console.error('This usually means the script is being run with "node" instead of "electron".');
  console.error('Electron Path:', electron);
  process.exit(1);
}

const { app, BrowserWindow, screen, globalShortcut, session, ipcMain, Menu, Tray, nativeImage, shell } = electron;

let logFilePath = null;

// 日志函数：同时写入文件和控制台
function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  // 如果日志路径还没初始化，先存控制台
  if (logFilePath) {
    try {
      if (fs.existsSync(logFilePath)) {
        fs.appendFileSync(logFilePath, logMessage);
      }
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }

  // 写入控制台
  console.log(message);
}

// 延迟初始化日志路径，确保 app 已加载
function initLogging() {
  try {
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    logFilePath = path.join(logsDir, `electron-${new Date().toISOString().split('T')[0]}.log`);
    // 创建初始日志文件如果不存在
    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '');
    }
    writeLog('[Main Process] Logging initialized');
  } catch (e) {
    console.error('Failed to initialize logging:', e);
  }
}

// 在 app 准备好之前安全地调用并锁定 App Name 确保统一数据目录
if (app) {
  app.name = 'Timer Widget';
  app.setAppUserModelId('com.unendev.timer-widget');
  app.disableHardwareAcceleration();
}

// 自动检测并无缝继承/迁移历史版本数据 (保证 Link Station、历史任务 100% 完好)
function migrateHistoricalUserData() {
  try {
    const userData = app.getPath('userData');
    const roaming = process.env.APPDATA || '';
    const candidateOldDirs = [
      path.join(roaming, 'timer-widget'),
      path.join(roaming, 'timer-widget-BACKUP-SAFE'),
      path.join(roaming, 'timer-widget-integrated'),
      path.join(roaming, 'timer-widget-electron'),
    ];

    if (!fs.existsSync(userData)) {
      fs.mkdirSync(userData, { recursive: true });
    }

    // 1. 迁移 Link Station 数据
    const targetLinkStation = path.join(userData, 'link-station-data.json');
    const currentLinkStationSize = fs.existsSync(targetLinkStation) ? fs.statSync(targetLinkStation).size : 0;
    if (currentLinkStationSize < 100) {
      for (const oldDir of candidateOldDirs) {
        const candidate = path.join(oldDir, 'link-station-data.json');
        if (fs.existsSync(candidate) && fs.statSync(candidate).size > 100) {
          fs.copyFileSync(candidate, targetLinkStation);
          console.log('[Main] Auto-migrated link-station-data.json from', candidate);
          break;
        }
      }
    }

    // 2. 迁移 timer-data.json
    const targetTimerData = path.join(userData, 'timer-data.json');
    if (!fs.existsSync(targetTimerData)) {
      for (const oldDir of candidateOldDirs) {
        const candidate = path.join(oldDir, 'timer-data.json');
        if (fs.existsSync(candidate) && fs.statSync(candidate).size > 100) {
          fs.copyFileSync(candidate, targetTimerData);
          console.log('[Main] Auto-migrated timer-data.json from', candidate);
          break;
        }
      }
    }

    // 3. 迁移 timer-window-state.json
    const targetWindowState = path.join(userData, 'timer-window-state.json');
    if (!fs.existsSync(targetWindowState)) {
      for (const oldDir of candidateOldDirs) {
        const candidate = path.join(oldDir, 'timer-window-state.json');
        if (fs.existsSync(candidate)) {
          fs.copyFileSync(candidate, targetWindowState);
          break;
        }
      }
    }
  } catch (err) {
    console.error('[Main] migrateHistoricalUserData error:', err);
  }
}

if (app) {
  migrateHistoricalUserData();
}

// 统一物理存储管理器 (Unified Physical Storage Manager)
const getUnifiedStoragePath = () => path.join(app.getPath('userData'), 'unified_storage.json');
const getBackupsDir = () => path.join(app.getPath('userData'), 'backups');

function loadUnifiedStorage() {
  try {
    const filePath = getUnifiedStoragePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Main Process] Failed to load unified storage:', err);
  }
  return {};
}

let saveStorageTimeout = null;
function createBackupSnapshot(data) {
  try {
    const backupsDir = getBackupsDir();
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(backupsDir, `snapshot-${timestamp}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(data, null, 2), 'utf-8');

    // 同时在项目根目录维护一份 backup_projects.json 作为双重安全网
    const rootBackupPath = path.join(__dirname, 'backup_projects.json');
    fs.writeFileSync(rootBackupPath, JSON.stringify(data, null, 2), 'utf-8');

    // 保留最近 10 个历史快照，自动清理更早快照
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length > 10) {
      files.slice(10).forEach(oldFile => {
        try {
          fs.unlinkSync(path.join(backupsDir, oldFile));
        } catch (_) {}
      });
    }
  } catch (err) {
    console.error('[Main Process] Failed to create backup snapshot:', err);
  }
}

function saveUnifiedStorage(data, immediateSnapshot = false) {
  try {
    const filePath = getUnifiedStoragePath();
    const backupsDir = getBackupsDir();
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    if (immediateSnapshot) {
      createBackupSnapshot(data);
    } else {
      if (saveStorageTimeout) clearTimeout(saveStorageTimeout);
      saveStorageTimeout = setTimeout(() => {
        createBackupSnapshot(data);
      }, 5000);
    }
  } catch (err) {
    console.error('[Main Process] Failed to save unified storage:', err);
  }
}

// 如果未打包且 NODE_ENV 不为 'production'，则视为开发模式
const isDev = (app && !app.isPackaged) && process.env.NODE_ENV !== 'production';
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

// API 地址：根据是否打包自动切换
// 打包后 (app.isPackaged = true) → 使用 Vercel 生产环境
// 开发中 (app.isPackaged = false) → 使用本地 localhost
const API_BASE_URL = (app && app.isPackaged)
  ? 'https://dashboard.unendev.com'
  : 'http://localhost:3001';

process.on('uncaughtException', (error) => {
  console.error('[Main Process] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main Process] Unhandled Rejection:', reason);
});

// 内存中缓存 Cookie，用于手动注入 (已废弃，保留变量防止引用报错，可后续删除)
let cachedSessionCookie = '';

app.on('ready', () => {
  initLogging();
  const ses = session.fromPartition('persist:timer-widget');
  // 已移除 Cookie 拦截器，改用纯 Token 认证方案
  writeLog('[Main Process] Ready (Token Auth Mode)');
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
    memo: { width: 720, height: 500, title: '⚡ 原子工作台', route: '/memo', alwaysOnTop: true, skipTaskbar: true },
    'task-memo': { width: 320, height: 450, title: '任务备注', route: '/memo?type=task', alwaysOnTop: false, skipTaskbar: false },
    todo: { width: 340, height: 500, title: '项目管理', route: '/todo', alwaysOnTop: true, skipTaskbar: true },
    ai: { width: 360, height: 500, title: 'AI 助手', route: '/ai', alwaysOnTop: true, skipTaskbar: true },
    settings: { width: 300, height: 350, title: '设置', route: '/settings', alwaysOnTop: true, skipTaskbar: true },
    create: { width: 500, height: 600, title: '新建任务', route: '/create', alwaysOnTop: true, skipTaskbar: true },
    promptLibrary: { width: 700, height: 600, title: '提示词库', route: '/prompt-library', alwaysOnTop: false, skipTaskbar: false },
    linkStation: { width: 520, height: 600, title: 'Link Station', route: '/link-station', alwaysOnTop: true, skipTaskbar: true },
  };
  const config = configs[type];
  console.log(`[Main] Creating window type: ${type}`, config);

  let x, y;
  if (mainWindow) {
    const [mainX, mainY] = mainWindow.getPosition();
    x = Math.max(10, mainX - config.width - 10);
    y = Math.max(10, mainY);
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

  if (config.alwaysOnTop) {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

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
let linkStationWindow;
let chartWindow;
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

  // 立即设置最高置顶层级
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

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
    // 强制设置置顶层级，确保在 Windows 上不被 Obsidian 等应用覆盖
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
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
  let dragEndTimeout = null;
  let isProgrammaticMove = false;

  mainWindow.on('move', () => {
    scheduleSave();
    if (isProgrammaticMove) {
      isProgrammaticMove = false;
      return;
    }

    // 防抖处理拖拽吸附，在用户停止拖拽后平滑进行边缘对齐，绝不中断用户的连续拖拽
    if (dragEndTimeout) clearTimeout(dragEndTimeout);
    dragEndTimeout = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;

      const bounds = mainWindow.getBounds();
      const display = screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();
      const { x: sx, y: sy, width: sw, height: sh } = display.workArea;
      const SNAP_THRESHOLD = 24;

      let nextX = bounds.x;
      let nextY = bounds.y;
      let snapped = false;

      // 贴左边缘磁吸（始终完全可见，绝不推入屏幕外）
      if (Math.abs(bounds.x - sx) < SNAP_THRESHOLD || bounds.x < sx) {
        nextX = sx;
        snapped = true;
      }
      // 贴右边缘磁吸
      else if (Math.abs((bounds.x + bounds.width) - (sx + sw)) < SNAP_THRESHOLD || (bounds.x + bounds.width) > (sx + sw)) {
        nextX = sx + sw - bounds.width;
        snapped = true;
      }

      // 贴顶边缘磁吸
      if (Math.abs(bounds.y - sy) < SNAP_THRESHOLD || bounds.y < sy) {
        nextY = sy;
        snapped = true;
      }
      // 贴底边缘磁吸
      else if (Math.abs((bounds.y + bounds.height) - (sy + sh)) < SNAP_THRESHOLD || (bounds.y + bounds.height) > (sy + sh)) {
        nextY = sy + sh - bounds.height;
        snapped = true;
      }

      if (snapped && (nextX !== bounds.x || nextY !== bounds.y)) {
        isProgrammaticMove = true;
        mainWindow.setBounds({ x: nextX, y: nextY, width: bounds.width, height: bounds.height });
        saveWindowState(mainWindow);
      }
    }, 150);
  });

  mainWindow.on('close', () => saveWindowState(mainWindow));

  mainWindow.on('focus', () => {
    // 每次获取焦点时重新应用置顶
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    globalShortcut.register('F5', () => mainWindow.reload());
    globalShortcut.register('CommandOrControl+Shift+I', () => mainWindow.webContents.toggleDevTools());
  });

  mainWindow.on('blur', () => {
    globalShortcut.unregister('F5');
    globalShortcut.unregister('CommandOrControl+Shift+I');
    // Re-enforce always on top on blur to prevent losing z-index
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  mainWindow.on('restore', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  mainWindow.on('closed', () => {
    stopHoverCheck();
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
  let iconPath = path.join(__dirname, 'icon.ico');
  if (!fs.existsSync(iconPath)) {
    // Fallback if structured differently in asar
    iconPath = path.join(process.resourcesPath, 'icon.ico');
  }

  try {
    const trayIcon = nativeImage.createFromPath(iconPath);
    tray = new Tray(trayIcon);
    tray.setToolTip('Timer Widget');
  } catch (e) {
    console.error('Failed to create tray:', e);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口 (Show)',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
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
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
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

function openLinkStationWindow() {
  if (linkStationWindow) {
    linkStationWindow.close();
    return;
  }
  linkStationWindow = createToolWindow('linkStation', null);
  if (isDev) linkStationWindow.webContents.openDevTools({ mode: 'detach' });
  linkStationWindow.on('closed', () => { linkStationWindow = null; });
}

function openChartWindow(query) {
  if (chartWindow && !chartWindow.isDestroyed()) {
    chartWindow.focus();
    loadWindow(chartWindow, `/chart?${query || ''}`);
    return;
  }

  const ses = session.fromPartition('persist:timer-widget');
  chartWindow = new BrowserWindow({
    width: 720,
    height: 560,
    title: '统计',
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a1a',
    alwaysOnTop: false,
    resizable: true,
    maximizable: false,
    minWidth: 360,
    minHeight: 300,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: ses,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
  });

  chartWindow.setMenu(null);
  if (isDev) chartWindow.webContents.openDevTools({ mode: 'detach' });

  loadWindow(chartWindow, `/chart?${query || ''}`);

  chartWindow.webContents.on('did-finish-load', () => {
    chartWindow.webContents.insertCSS(`
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; }
      [data-drag="true"] { -webkit-app-region: drag; }
      [data-drag="false"] { -webkit-app-region: no-drag; }
    `);
  });

  chartWindow.on('closed', () => { chartWindow = null; });
}

ipcMain.on('open-create-window', () => openCreateWindow());
// ipcMain.on('open-create-window', () => openCreateWindow()); // Duplicate removed
ipcMain.on('open-memo-window', () => openMemoWindow());
ipcMain.on('open-task-memo-window', (event, { taskId, taskName }) => openTaskMemoWindow(taskId, taskName));
ipcMain.on('open-todo-window', () => openTodoWindow());
ipcMain.on('open-ai-window', () => openAiWindow());
ipcMain.on('open-settings-window', () => openSettingsWindow());
ipcMain.on('open-prompt-library-window', () => openPromptLibraryWindow());
ipcMain.on('open-link-station-window', () => openLinkStationWindow());
ipcMain.on('open-chart-window', (event, { query }) => openChartWindow(query));
ipcMain.on('open-external-link', async (event, url) => {
  try {
    await shell.openExternal(url);
  } catch (err) {
    console.error(`[Main] Failed to open external link '${url}':`, err);
  }
});

// Link Station Data Persistence
ipcMain.handle('get-links-data', async () => {
  try {
    const dataPath = path.join(app.getPath('userData'), 'link-station-data.json');
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8');
      if (content.length > 100) {
        return JSON.parse(content);
      }
    }
    // 兜底检查旧数据目录
    const roaming = process.env.APPDATA || '';
    const oldCandidates = [
      path.join(roaming, 'timer-widget', 'link-station-data.json'),
      path.join(roaming, 'timer-widget-BACKUP-SAFE', 'link-station-data.json'),
    ];
    for (const oldP of oldCandidates) {
      if (fs.existsSync(oldP)) {
        const raw = fs.readFileSync(oldP, 'utf-8');
        if (raw.length > 100) {
          fs.writeFileSync(dataPath, raw, 'utf-8');
          return JSON.parse(raw);
        }
      }
    }
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
    return null;
  } catch (e) {
    console.error('Failed to read link station data', e);
    return null;
  }
});

// 统一持久化存储 IPC 接口 (实现 Dev 与打包 EXE 物理存储共享与备份)
ipcMain.handle('get-unified-storage', async () => {
  return loadUnifiedStorage();
});

ipcMain.on('save-unified-storage', (event, { key, value, allData }) => {
  const current = loadUnifiedStorage();
  if (key && value !== undefined) {
    current[key] = value;
  } else if (allData && typeof allData === 'object') {
    Object.assign(current, allData);
  }
  saveUnifiedStorage(current);
});

ipcMain.handle('create-manual-backup', async () => {
  const data = loadUnifiedStorage();
  createBackupSnapshot(data);
  return { success: true, backupDir: getBackupsDir() };
});

// Scan all possible skill directories and return parsed skills
ipcMain.handle('get-agent-skills', async () => {
  const skills = [];
  const pathsToScan = new Set();

  // 1. Read C:\Users\a1634\.gemini\antigravity\skills.txt
  try {
    const txtPath = 'C:\\Users\\a1634\\.gemini\\antigravity\\skills.txt';
    if (fs.existsSync(txtPath)) {
      const content = fs.readFileSync(txtPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
          pathsToScan.add(trimmed);
        }
      });
    }
  } catch (e) {
    console.error('Failed to read skills.txt:', e);
  }

  // 2. Scan C:\Users\a1634\.gemini\antigravity\skills directory
  const skillsDir = 'C:\\Users\\a1634\\.gemini\\antigravity\\skills';
  if (fs.existsSync(skillsDir)) {
    pathsToScan.add(skillsDir);
  }

  // 3. Scan C:\Users\a1634\.agents\skills as fallback
  const defaultAgentsSkillsDir = 'C:\\Users\\a1634\\.agents\\skills';
  if (fs.existsSync(defaultAgentsSkillsDir)) {
    pathsToScan.add(defaultAgentsSkillsDir);
  }

  // 4. Scan C:\Users\a1634\.claude\skills (Claude Code skills)
  const claudeSkillsDir = 'C:\\Users\\a1634\\.claude\\skills';
  if (fs.existsSync(claudeSkillsDir)) {
    pathsToScan.add(claudeSkillsDir);
  }

  // Scan all unique paths
  for (const dirPath of pathsToScan) {
    try {
      if (!fs.existsSync(dirPath)) continue;
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) continue;

      const subs = fs.readdirSync(dirPath);
      for (const sub of subs) {
        const subPath = path.join(dirPath, sub);
        try {
          if (!fs.existsSync(subPath)) continue;
          const subStat = fs.statSync(subPath);
          if (subStat.isDirectory()) {
            const skillMdPath = path.join(subPath, 'SKILL.md');
            if (fs.existsSync(skillMdPath)) {
              const content = fs.readFileSync(skillMdPath, 'utf-8');
              
              let name = sub;
              let description = '';
              let promptContent = content;

              const fmRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n/;
              const match = content.match(fmRegex);
              if (match) {
                const fmText = match[1];
                promptContent = content.replace(fmRegex, '');
                
                fmText.split('\n').forEach(line => {
                  const colonIndex = line.indexOf(':');
                  if (colonIndex > -1) {
                    const key = line.substring(0, colonIndex).trim();
                    const val = line.substring(colonIndex + 1).trim();
                    if (key === 'name') name = val;
                    if (key === 'description') description = val;
                  }
                });
              }

              skills.push({
                id: `${dirPath}-${sub}`,
                name,
                description,
                content: promptContent.trim(),
                path: skillMdPath
              });
            }
          }
        } catch (innerErr) {
          console.error(`Error scanning subpath ${subPath}:`, innerErr);
        }
      }
    } catch (err) {
      console.error(`Error scanning dirPath ${dirPath}:`, err);
    }
  }

  return skills;
});

ipcMain.on('save-links-data', (event, data) => {
  try {
    const dataPath = path.join(app.getPath('userData'), 'link-station-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save link station data', e);
  }
});

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
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
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
      label: '📁 项目管理',
      click: () => {
        openTodoWindow();
      }
    },
    {
      label: '🤖 AI 助手',
      click: () => {
        openAiWindow();
      }
    },
    { type: 'separator' },
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

// 模式切换菜单
ipcMain.on('show-mode-menu', (event) => {
  const template = [
    {
      label: '⏱️ 专注模式',
      click: () => {
        event.sender.send('on-mode-selected', 'focus');
      }
    },
    {
      label: '⏱️ 秒表模式',
      click: () => {
        event.sender.send('on-mode-selected', 'stopwatch');
      }
    },
    {
      label: '⏳ 倒计时模式',
      click: () => {
        event.sender.send('on-mode-selected', 'countdown');
      }
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

ipcMain.on('backup-and-push', async (event, backupData) => {
  const timestamp = new Date().toLocaleString();
  const backupFilePath = path.join(__dirname, 'backup_projects.json');
  
  logToCombined('info', `📦 [Main Process] Starting backup to: ${backupFilePath}`);
  
  try {
    // 1. 写入文件
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    logToCombined('info', '✅ [Main Process] Backup file written.');

    // 2. 执行 Git 命令
    const commitMsg = `chore: auto-backup local projects [${timestamp}]`;
    const gitCmd = `git add backup_projects.json && git commit -m "${commitMsg}" && git push`;
    
    logToCombined('info', `🐚 [Main Process] Executing: ${gitCmd}`);
    
    exec(gitCmd, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        logToCombined('error', `❌ [Main Process] Git backup failed: ${error.message}`);
        return;
      }
      logToCombined('info', '✅ [Main Process] Git backup successful.');
      if (stdout) logToCombined('info', `[Git Output] ${stdout}`);
    });
  } catch (err) {
    logToCombined('error', `❌ [Main Process] Backup process failed: ${err.message}`);
  }
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createMainWindow();
});
