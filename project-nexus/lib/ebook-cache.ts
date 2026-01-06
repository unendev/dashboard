/**
 * IndexedDB 电子书缓存管理器
 * 用于缓存 EPUB 文件，减少 OSS 流量消耗
 */

const DB_NAME = 'EbookCache';
const DB_VERSION = 1;
const STORE_NAME = 'books';
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200 MB
const CLEANUP_THRESHOLD = 0.9; // 90% 时触发清理
const CLEANUP_RATIO = 0.2; // 清理 20% 的书籍

export interface CachedBook {
  bookId: string;        // 主键
  fileUrl: string;       // 原始 OSS URL
  blob: Blob;           // EPUB 文件
  cachedAt: number;     // 缓存时间戳
  lastAccessAt: number; // 最后访问时间
  fileSize: number;     // 文件大小（字节）
  title: string;        // 书名
}

export interface CacheStats {
  totalSize: number;     // 总占用空间
  totalBooks: number;    // 总书籍数
  books: Array<{
    bookId: string;
    title: string;
    fileSize: number;
    cachedAt: Date;
    lastAccessAt: Date;
  }>;
}

/**
 * 初始化 IndexedDB 数据库
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // 检查浏览器支持
    if (!window.indexedDB) {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('无法打开 IndexedDB 数据库'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建对象存储（如果不存在）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'bookId' });
        
        // 创建索引
        objectStore.createIndex('lastAccessAt', 'lastAccessAt', { unique: false });
        objectStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        objectStore.createIndex('fileSize', 'fileSize', { unique: false });
      }
    };
  });
}

/**
 * 获取缓存的书籍
 */
export async function getBook(bookId: string): Promise<Blob | null> {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(bookId);

      request.onsuccess = () => {
        const cachedBook = request.result as CachedBook | undefined;
        if (cachedBook) {
          // 异步更新最后访问时间（不阻塞读取）
          updateLastAccess(bookId).catch(console.error);
          resolve(cachedBook.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error('读取缓存失败'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('获取缓存书籍失败:', error);
    return null;
  }
}

/**
 * 缓存书籍
 */
export async function setBook(
  bookId: string,
  fileUrl: string,
  blob: Blob,
  title: string
): Promise<void> {
  try {
    const db = await initDB();

    // 检查容量并清理
    await checkAndCleanup(blob.size);

    const cachedBook: CachedBook = {
      bookId,
      fileUrl,
      blob,
      cachedAt: Date.now(),
      lastAccessAt: Date.now(),
      fileSize: blob.size,
      title,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.put(cachedBook);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('缓存书籍失败'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('缓存书籍失败:', error);
    throw error;
  }
}

/**
 * 更新最后访问时间（用于 LRU）
 */
export async function updateLastAccess(bookId: string): Promise<void> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const getRequest = objectStore.get(bookId);

      getRequest.onsuccess = () => {
        const cachedBook = getRequest.result as CachedBook | undefined;
        if (cachedBook) {
          cachedBook.lastAccessAt = Date.now();
          objectStore.put(cachedBook);
        }
        resolve();
      };

      getRequest.onerror = () => {
        reject(new Error('更新访问时间失败'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('更新访问时间失败:', error);
  }
}

/**
 * 获取所有缓存的书籍
 */
export async function getAllBooks(): Promise<CachedBook[]> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result as CachedBook[]);
      };

      request.onerror = () => {
        reject(new Error('获取缓存列表失败'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('获取缓存列表失败:', error);
    return [];
  }
}

/**
 * 删除单本书籍
 */
export async function deleteBook(bookId: string): Promise<void> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(bookId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('删除缓存失败'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('删除缓存失败:', error);
    throw error;
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllBooks(): Promise<void> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('清空缓存失败'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('清空缓存失败:', error);
    throw error;
  }
}

/**
 * 获取总占用空间
 */
export async function getTotalSize(): Promise<number> {
  try {
    const books = await getAllBooks();
    return books.reduce((total, book) => total + book.fileSize, 0);
  } catch (error) {
    console.error('获取总占用空间失败:', error);
    return 0;
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const books = await getAllBooks();
    const totalSize = books.reduce((sum, book) => sum + book.fileSize, 0);

    return {
      totalSize,
      totalBooks: books.length,
      books: books.map((book) => ({
        bookId: book.bookId,
        title: book.title,
        fileSize: book.fileSize,
        cachedAt: new Date(book.cachedAt),
        lastAccessAt: new Date(book.lastAccessAt),
      })),
    };
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return {
      totalSize: 0,
      totalBooks: 0,
      books: [],
    };
  }
}

/**
 * 检查容量并执行 LRU 清理
 */
async function checkAndCleanup(newFileSize: number): Promise<void> {
  const currentSize = await getTotalSize();
  const projectedSize = currentSize + newFileSize;

  // 如果添加新文件后超过阈值，触发清理
  if (projectedSize > MAX_CACHE_SIZE * CLEANUP_THRESHOLD) {
    console.log('缓存空间即将达到上限，开始 LRU 清理...');
    await clearOldBooks();
  }
}

/**
 * 清理最旧的书籍（LRU 策略）
 */
async function clearOldBooks(): Promise<void> {
  try {
    const books = await getAllBooks();
    
    // 按最后访问时间排序（最旧的在前）
    const sortedBooks = books.sort((a, b) => a.lastAccessAt - b.lastAccessAt);
    
    // 计算要删除的数量
    const deleteCount = Math.ceil(sortedBooks.length * CLEANUP_RATIO);
    const booksToDelete = sortedBooks.slice(0, deleteCount);

    console.log(`准备删除 ${deleteCount} 本最久未访问的书籍`);

    // 删除书籍
    for (const book of booksToDelete) {
      await deleteBook(book.bookId);
      console.log(`已删除: ${book.title} (${formatFileSize(book.fileSize)})`);
    }

    const newSize = await getTotalSize();
    console.log(`清理完成，当前占用: ${formatFileSize(newSize)}`);
  } catch (error) {
    console.error('LRU 清理失败:', error);
  }
}

/**
 * 检查书籍是否已缓存
 */
export async function isBookCached(bookId: string): Promise<boolean> {
  try {
    const blob = await getBook(bookId);
    return blob !== null;
  } catch {
    return false;
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 获取缓存使用百分比
 */
export async function getCacheUsagePercent(): Promise<number> {
  const totalSize = await getTotalSize();
  return (totalSize / MAX_CACHE_SIZE) * 100;
}

/**
 * 获取最大缓存容量
 */
export function getMaxCacheSize(): number {
  return MAX_CACHE_SIZE;
}

/**
 * 检查 IndexedDB 是否可用
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && !!window.indexedDB;
}

