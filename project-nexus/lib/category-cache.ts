// 全局分类数据缓存
type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

type CachePayload = {
  ts: number;
  data: CategoryNode[];
};

const STORAGE_KEY = 'category-cache-v1';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let categoriesCache: CategoryNode[] = [];
let isCacheReady = false;
let cachePromise: Promise<CategoryNode[]> | null = null;
let isRefreshing = false;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const loadFromStorage = (ttlMs: number): CategoryNode[] | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as CachePayload;
    if (!payload || !Array.isArray(payload.data) || typeof payload.ts !== 'number') return null;
    if (Date.now() - payload.ts > ttlMs) return null;
    return payload.data;
  } catch (error) {
    console.warn('读取分类缓存失败:', error);
    return null;
  }
};

const saveToStorage = (data: CategoryNode[]) => {
  if (!canUseStorage()) return;
  try {
    const payload: CachePayload = { ts: Date.now(), data };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('写入分类缓存失败:', error);
  }
};

const clearStorage = () => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('清理分类缓存失败:', error);
  }
};

const fetchCategories = (): Promise<CategoryNode[]> =>
  fetch('/api/log-categories')
    .then(res => res.json())
    .then((data: CategoryNode[]) => {
      categoriesCache = data;
      isCacheReady = true;
      saveToStorage(data);
      console.log('分类数据缓存已准备就绪');
      return data;
    })
    .catch(error => {
      console.error('预加载分类数据失败:', error);
      isCacheReady = true;
      return [];
    });

const refreshInBackground = () => {
  if (isRefreshing) return;
  isRefreshing = true;
  fetchCategories()
    .catch(() => undefined)
    .finally(() => {
      isRefreshing = false;
      cachePromise = null;
    });
};

export const CategoryCache = {
  // 从本地存储加载缓存 (删除)
  // saveToStorage(data: CategoryNode[]): void (删除)

  // 预加载分类数据
  async preload(options?: { forceRefresh?: boolean; ttlMs?: number }): Promise<CategoryNode[]> {
    const forceRefresh = options?.forceRefresh ?? false;
    const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

    if (forceRefresh) {
      cachePromise = fetchCategories();
      return cachePromise;
    }

    if (isCacheReady && categoriesCache.length > 0) {
      return categoriesCache;
    }

    const cached = loadFromStorage(ttlMs);
    if (cached && cached.length > 0) {
      categoriesCache = cached;
      isCacheReady = true;
      refreshInBackground();
      return cached;
    }

    if (cachePromise) {
      return cachePromise;
    }

    cachePromise = fetchCategories();
    return cachePromise;
  },

  // 获取缓存的分类数据
  getCategories(): CategoryNode[] {
    return categoriesCache;
  },

  // 读取本地缓存（不触发网络请求）
  getCached(ttlMs?: number): CategoryNode[] {
    const cached = loadFromStorage(ttlMs ?? DEFAULT_TTL_MS);
    if (cached && cached.length > 0) {
      categoriesCache = cached;
      isCacheReady = true;
      return cached;
    }
    return categoriesCache;
  },

  // 检查缓存是否准备就绪
  isReady(): boolean {
    return isCacheReady;
  },

  // 更新缓存
  updateCategories(categories: CategoryNode[]): void {
    categoriesCache = categories;
  },

  // 清除缓存
  clear(): void {
    categoriesCache = [];
    isCacheReady = false;
    cachePromise = null;
    clearStorage();
  }
};
