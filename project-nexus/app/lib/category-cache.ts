// 全局分类数据缓存
type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

let categoriesCache: CategoryNode[] = [];
let isCacheReady = false;
let cachePromise: Promise<CategoryNode[]> | null = null;

const CACHE_KEY = 'category_cache';
const CACHE_TIMESTAMP_KEY = 'category_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存（分类数据变化很少）

export const CategoryCache = {
  // 从本地存储加载缓存
  loadFromStorage(): CategoryNode[] | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          const data = JSON.parse(cached) as CategoryNode[];
          categoriesCache = data;
          isCacheReady = true;
          console.log('从本地存储加载分类缓存，数据量:', data.length);
          return data;
        } else {
          console.log('本地缓存已过期，清除缓存');
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        }
      } else {
        console.log('没有找到本地缓存');
      }
    } catch (error) {
      console.error('加载本地缓存失败:', error);
    }
    return null;
  },

  // 保存到本地存储
  saveToStorage(data: CategoryNode[]): void {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('分类缓存已保存到本地存储');
    } catch (error) {
      console.error('保存本地缓存失败:', error);
    }
  },

  // 预加载分类数据
  async preload(): Promise<CategoryNode[]> {
    if (cachePromise) {
      return cachePromise;
    }

    // 首先尝试从本地存储加载
    const cachedData = this.loadFromStorage();
    if (cachedData) {
      return cachedData;
    }

    cachePromise = fetch('/api/log-categories')
      .then(res => res.json())
      .then((data: CategoryNode[]) => {
        categoriesCache = data;
        isCacheReady = true;
        // 保存到本地存储
        this.saveToStorage(data);
        console.log('分类数据缓存已准备就绪');
        return data;
      })
      .catch(error => {
        console.error('预加载分类数据失败:', error);
        isCacheReady = true; // 即使失败也标记为ready
        return [];
      });

    return cachePromise;
  },

  // 获取缓存的分类数据
  getCategories(): CategoryNode[] {
    return categoriesCache;
  },

  // 检查缓存是否准备就绪
  isReady(): boolean {
    return isCacheReady;
  },

  // 更新缓存
  updateCategories(categories: CategoryNode[]): void {
    categoriesCache = categories;
    // 同时更新本地存储
    this.saveToStorage(categories);
  },

  // 清除缓存
  clear(): void {
    categoriesCache = [];
    isCacheReady = false;
    cachePromise = null;
    
    // 清除本地存储
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      }
    } catch (error) {
      console.error('清除本地缓存失败:', error);
    }
  }
};
