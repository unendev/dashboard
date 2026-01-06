/**
 * WebDAV 配置管理
 * 支持在页面中显式指定配置，而不仅依赖环境变量
 * 配置会持久化到服务器数据库
 */

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  ebookPath: string;
}

const STORAGE_KEY = 'webdav-config';
const API_ENDPOINT = '/api/webread/webdav-config';

// 默认配置（从环境变量读取）
const DEFAULT_CONFIG: WebDAVConfig = {
  url: typeof process !== 'undefined' && process.env.WEBDAV_URL 
    ? process.env.WEBDAV_URL 
    : 'http://localhost:8080/webdav',
  username: typeof process !== 'undefined' && process.env.WEBDAV_USERNAME 
    ? process.env.WEBDAV_USERNAME 
    : 'admin',
  password: typeof process !== 'undefined' && process.env.WEBDAV_PASSWORD 
    ? process.env.WEBDAV_PASSWORD 
    : 'admin',
  ebookPath: typeof process !== 'undefined' && process.env.WEBDAV_EBOOK_PATH 
    ? process.env.WEBDAV_EBOOK_PATH 
    : '/ebooks',
};

// 从 localStorage 加载配置（用于离线支持）
function loadConfigFromStorage(): WebDAVConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[WebDAV Config] Failed to load from storage:', error);
    return null;
  }
}

// 保存配置到 localStorage（用于离线支持）
function saveConfigToStorage(config: WebDAVConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('[WebDAV Config] Failed to save to storage:', error);
  }
}

// 从服务器加载配置
async function loadConfigFromServer(): Promise<WebDAVConfig | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      console.error('[WebDAV Config] Server returned:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('[WebDAV Config] Failed to load from server:', error);
    return null;
  }
}

// 保存配置到服务器
async function saveConfigToServer(config: WebDAVConfig): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      console.error('[WebDAV Config] Server save failed:', response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[WebDAV Config] Failed to save to server:', error);
    return false;
  }
}

// 当前配置（可以在运行时修改）
let currentConfig: WebDAVConfig = loadConfigFromStorage() || { ...DEFAULT_CONFIG };
let configLoaded = false;

/**
 * 获取当前 WebDAV 配置
 */
export function getWebDAVConfig(): WebDAVConfig {
  return { ...currentConfig };
}

/**
 * 初始化配置（从服务器加载）
 * 应该在应用启动时调用
 */
export async function initWebDAVConfig(): Promise<void> {
  if (configLoaded) return;
  
  try {
    const serverConfig = await loadConfigFromServer();
    if (serverConfig) {
      currentConfig = serverConfig;
      saveConfigToStorage(currentConfig);
      console.log('[WebDAV Config] Loaded from server');
    }
  } catch (error) {
    console.error('[WebDAV Config] Failed to initialize:', error);
  }
  
  configLoaded = true;
}

/**
 * 设置 WebDAV 配置
 * 用于在页面中显式指定配置
 */
export async function setWebDAVConfig(config: Partial<WebDAVConfig>): Promise<boolean> {
  currentConfig = {
    ...currentConfig,
    ...config,
  };
  
  // 同时保存到本地和服务器
  saveConfigToStorage(currentConfig);
  const saved = await saveConfigToServer(currentConfig);
  
  if (saved) {
    console.log('[WebDAV Config] Configuration updated and saved to server:', {
      url: currentConfig.url,
      username: currentConfig.username,
      ebookPath: currentConfig.ebookPath,
    });
  } else {
    console.warn('[WebDAV Config] Configuration updated locally but failed to save to server');
  }
  
  return saved;
}

/**
 * 重置为默认配置
 */
export async function resetWebDAVConfig(): Promise<void> {
  currentConfig = { ...DEFAULT_CONFIG };
  localStorage.removeItem(STORAGE_KEY);
  await saveConfigToServer(currentConfig);
  console.log('[WebDAV Config] Configuration reset to defaults');
}

/**
 * 验证配置是否有效
 */
export function isWebDAVConfigValid(): boolean {
  return !!(
    currentConfig.url &&
    currentConfig.username &&
    currentConfig.password &&
    currentConfig.ebookPath
  );
}

/**
 * 获取配置摘要（用于日志）
 */
export function getWebDAVConfigSummary(): string {
  return `WebDAV: ${currentConfig.url}${currentConfig.ebookPath} (user: ${currentConfig.username})`;
}

/**
 * 测试 WebDAV 连接
 */
export async function testWebDAVConnection(): Promise<boolean> {
  try {
    // 动态导入以避免循环依赖
    const { testWebDAVConnection: test } = await import('./webdav-cache');
    return await test();
  } catch (error) {
    console.error('[WebDAV Config] Connection test failed:', error);
    return false;
  }
}
