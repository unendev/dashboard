/**
 * 统一桌面端持久化存储桥接器 (Unified Desktop Storage Bridge)
 * 解决 Web LocalStorage 在 Dev (http://localhost) 与 打包 (file://) 之间物理隔离导致的数据丢失问题。
 */

// 启动时自动从主进程物理存储同步对齐数据
let isHydrated = false;

export async function hydrateFromUnifiedStorage(): Promise<void> {
  if (isHydrated || !window.electron || typeof window.electron.invoke !== 'function') {
    return;
  }

  try {
    const physicalData = await window.electron.invoke('get-unified-storage');
    if (physicalData && typeof physicalData === 'object') {
      let hasHydratedAny = false;
      Object.keys(physicalData).forEach(key => {
        const localValue = localStorage.getItem(key);
        // 如果本地 localStorage 为空或者物理文件有有效数据，进行对齐
        if (!localValue && physicalData[key] !== undefined) {
          const strValue = typeof physicalData[key] === 'string' 
            ? physicalData[key] 
            : JSON.stringify(physicalData[key]);
          localStorage.setItem(key, strValue);
          hasHydratedAny = true;
        }
      });

      if (hasHydratedAny) {
        console.log('[UnifiedStorage] Hydrated local storage from physical storage file.');
        window.dispatchEvent(new Event('storage'));
      }
    }
  } catch (err) {
    console.error('[UnifiedStorage] Failed to hydrate from physical storage:', err);
  } finally {
    isHydrated = true;
  }
}

// 自动在模块载入时尝试一次对齐
hydrateFromUnifiedStorage();

/**
 * 统一获取存储项
 */
export function getUnifiedItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }
  } catch (e) {
    console.error(`[UnifiedStorage] Failed to parse item for key '${key}':`, e);
  }
  return defaultValue;
}

/**
 * 统一设置存储项 (双写: localStorage + Electron 物理文件)
 */
export function setUnifiedItem<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);

    // 同步写入 Electron 物理 JSON 文件
    if (window.electron && typeof window.electron.send === 'function') {
      window.electron.send('save-unified-storage', {
        key,
        value,
      });
    }
  } catch (e) {
    console.error(`[UnifiedStorage] Failed to save item for key '${key}':`, e);
  }
}

/**
 * 手动触发一次快照备份
 */
export async function createManualSnapshot(): Promise<{ success: boolean; backupDir?: string }> {
  if (window.electron && typeof window.electron.invoke === 'function') {
    try {
      return await window.electron.invoke('create-manual-backup');
    } catch (e) {
      console.error('[UnifiedStorage] Manual snapshot failed:', e);
    }
  }
  return { success: false };
}
