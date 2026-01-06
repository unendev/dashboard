// 全局事务项数据缓存
interface InstanceTag {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

let instanceTagsCache: InstanceTag[] = [];
let isCacheReady = false;
let cachePromise: Promise<InstanceTag[]> | null = null;

const CACHE_KEY = 'instance_tag_cache';
const CACHE_TIMESTAMP_KEY = 'instance_tag_cache_timestamp';
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时缓存（事务项变化相对频繁）

export const InstanceTagCache = {
  // 从本地存储加载缓存
  loadFromStorage(): InstanceTag[] | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          const data = JSON.parse(cached) as InstanceTag[];
          instanceTagsCache = data;
          isCacheReady = true;
          console.log('从本地存储加载事务项缓存，数据量:', data.length);
          return data;
        } else {
          console.log('事务项本地缓存已过期，清除缓存');
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        }
      } else {
        console.log('没有找到事务项本地缓存');
      }
    } catch (error) {
      console.error('加载事务项本地缓存失败:', error);
    }
    return null;
  },

  // 保存到本地存储
  saveToStorage(data: InstanceTag[]): void {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('事务项缓存已保存到本地存储');
    } catch (error) {
      console.error('保存事务项本地缓存失败:', error);
    }
  },

  // 预加载事务项数据
  async preload(userId: string = 'user-1'): Promise<InstanceTag[]> {
    if (cachePromise) {
      return cachePromise;
    }

    // 首先尝试从本地存储加载
    const cachedData = this.loadFromStorage();
    if (cachedData) {
      return cachedData;
    }

    cachePromise = fetch(`/api/instance-tags?userId=${userId}`)
      .then(res => res.json())
      .then((data: InstanceTag[]) => {
        instanceTagsCache = data;
        isCacheReady = true;
        // 保存到本地存储
        this.saveToStorage(data);
        console.log('事务项数据缓存已准备就绪');
        return data;
      })
      .catch(error => {
        console.error('预加载事务项数据失败:', error);
        isCacheReady = true; // 即使失败也标记为ready
        return [];
      });

    return cachePromise;
  },

  // 获取缓存的事务项数据
  getInstanceTags(): InstanceTag[] {
    return instanceTagsCache;
  },

  // 检查缓存是否准备就绪
  isReady(): boolean {
    return isCacheReady;
  },

  // 更新缓存（添加新的事务项）
  addInstanceTag(tag: InstanceTag): void {
    instanceTagsCache = [...instanceTagsCache, tag];
    this.saveToStorage(instanceTagsCache);
  },

  // 更新缓存（删除事务项）
  removeInstanceTag(tagId: string): void {
    instanceTagsCache = instanceTagsCache.filter(tag => tag.id !== tagId);
    this.saveToStorage(instanceTagsCache);
  },

  // 更新缓存（完全替换）
  updateInstanceTags(tags: InstanceTag[]): void {
    instanceTagsCache = tags;
    this.saveToStorage(tags);
  },

  // 清除缓存
  clear(): void {
    instanceTagsCache = [];
    isCacheReady = false;
    cachePromise = null;
    
    // 清除本地存储
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      }
    } catch (error) {
      console.error('清除事务项本地缓存失败:', error);
    }
  }
};


