# 浏览器控制台调试指南

## 快速诊断

在浏览器 F12 控制台中运行以下命令来诊断问题。

### 1. 检查 IndexedDB 状态

```javascript
// 检查 IndexedDB 数据库是否存在
indexedDB.databases().then(dbs => {
  console.log('Available databases:', dbs);
});

// 打开 webread-books 数据库
const dbRequest = indexedDB.open('webread-books', 2);
dbRequest.onsuccess = () => {
  const db = dbRequest.result;
  console.log('Database opened successfully');
  console.log('Object stores:', Array.from(db.objectStoreNames));
  
  // 检查 books 表中的数据
  const tx = db.transaction(['books'], 'readonly');
  const store = tx.objectStore('books');
  const getAllRequest = store.getAll();
  
  getAllRequest.onsuccess = () => {
    console.log('Books in IndexedDB:', getAllRequest.result.length);
    getAllRequest.result.forEach(book => {
      console.log(`  - ${book.id}: ${book.blob.size} bytes`);
    });
  };
};

dbRequest.onerror = () => {
  console.error('Failed to open database:', dbRequest.error);
};
```

### 2. 检查 WebDAV 配置

```javascript
// 获取当前 WebDAV 配置
fetch('/api/webread/webdav-config')
  .then(r => r.json())
  .then(config => {
    console.log('WebDAV Config:', {
      url: config.url,
      username: config.username,
      ebookPath: config.ebookPath,
      // password 不显示
    });
  })
  .catch(e => console.error('Failed to fetch config:', e));
```

### 3. 测试 WebDAV 连接

```javascript
// 测试 WebDAV 连接
async function testWebDAV() {
  try {
    const config = await fetch('/api/webread/webdav-config').then(r => r.json());
    console.log('Testing WebDAV connection to:', config.url);
    
    // 这会调用后端的 testWebDAVConnection 函数
    const response = await fetch('/api/webread/webdav-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (response.ok) {
      console.log('✓ WebDAV connection successful');
    } else {
      console.error('✗ WebDAV connection failed:', response.status);
    }
  } catch (e) {
    console.error('Error testing WebDAV:', e);
  }
}

testWebDAV();
```

### 4. 检查书籍加载过程

```javascript
// 在打开书籍时，查看完整的加载日志
// 打开浏览器控制台，然后点击书籍

// 过滤 WebDAV 日志
console.log('=== WebDAV Logs ===');
// 控制台会显示所有 [WebDAV] 前缀的日志

// 过滤 EpubReader 日志
console.log('=== EpubReader Logs ===');
// 控制台会显示所有 [EpubReader] 前缀的日志

// 查看是否有错误
console.log('=== Errors ===');
// 查看是否有红色的错误消息
```

### 5. 手动测试书籍加载

```javascript
// 直接调用 webdavCache.getBook() 来测试
// 注意：这需要在 /webread/read/[id] 页面上运行

// 首先，获取当前书籍 ID
const bookId = window.location.pathname.split('/').pop();
console.log('Current book ID:', bookId);

// 然后测试加载
import('/lib/webdav-cache.js').then(module => {
  console.log('Testing getBook()...');
  module.getBook(bookId).then(blob => {
    if (blob) {
      console.log('✓ Book loaded successfully, size:', blob.size);
    } else {
      console.log('✗ Book not found');
    }
  }).catch(e => {
    console.error('✗ Error loading book:', e);
  });
});
```

### 6. 检查 Zustand 状态

```javascript
// 检查 reader store 状态
// 注意：这需要在 /webread/read/[id] 页面上运行

// 获取 store 状态
const state = window.__ZUSTAND_STORE__?.getState?.();
if (state) {
  console.log('Reader Store State:', {
    isReady: state.isReady,
    currentCfi: state.currentCfi,
    progress: state.progress,
    fontSize: state.fontSize,
    theme: state.theme,
  });
} else {
  console.log('Store not accessible from console');
}
```

### 7. 清除缓存并重新加载

```javascript
// 清除 IndexedDB
const dbRequest = indexedDB.open('webread-books', 2);
dbRequest.onsuccess = () => {
  const db = dbRequest.result;
  db.close();
  indexedDB.deleteDatabase('webread-books');
  console.log('IndexedDB cleared');
  location.reload();
};

// 或者清除 localStorage
localStorage.removeItem('webread-store');
localStorage.removeItem('webdav-config');
console.log('LocalStorage cleared');
location.reload();
```

## 常见问题排查

### 问题 1: 加载器一直显示

**检查步骤:**
1. 打开 F12 控制台
2. 查看是否有错误消息
3. 运行 `testWebDAV()` 检查连接
4. 运行 `indexedDB.databases()` 检查数据库

**可能原因:**
- WebDAV 连接失败
- 书籍文件不存在
- IndexedDB 卡住
- 网络超时

### 问题 2: 显示错误信息

**检查步骤:**
1. 记下错误消息
2. 检查 WebDAV 配置是否正确
3. 检查书籍文件是否存在
4. 检查网络连接

**常见错误:**
- `书籍未找到` - 检查 WebDAV 路径
- `Display timeout` - 这是正常的，会自动恢复
- `Connection refused` - 检查 WebDAV 服务器

### 问题 3: 书籍显示但无法滚动

**检查步骤:**
1. 检查浏览器控制台是否有 JavaScript 错误
2. 尝试刷新页面
3. 尝试清除缓存

**可能原因:**
- EpubJS 初始化不完整
- 样式应用失败
- 事件监听器未正确设置

## 日志格式

### WebDAV 日志
```
[WebDAV] Getting book: book-123
[WebDAV] ✓ Book found in local cache
[WebDAV] ✓ Book loaded from WebDAV, size: 1234567
```

### EpubReader 日志
```
[EpubReader] Starting book load for bookId: book-123
[EpubReader] ✓ Book loaded from WebDAV, size: 1234567
[EpubReader] ✓ Book initialized
[EpubReader] ✓ Rendition created
[EpubReader] ✓ Content displayed
[EpubReader] ✓ Book ready for reading
```

### 错误日志
```
[EpubReader] Fatal error during book load: 书籍未找到，请确认已上传到 WebDAV
[WebDAV] Failed to get book: Error: ...
```

## 性能监控

```javascript
// 测量加载时间
const startTime = performance.now();

// ... 加载书籍 ...

const endTime = performance.now();
console.log(`Loading time: ${(endTime - startTime).toFixed(2)}ms`);

// 目标:
// - 本地缓存: < 1000ms
// - 云端获取: < 5000ms
// - 超时恢复: < 8000ms
```

## 导出日志

```javascript
// 将所有控制台日志导出为文本
const logs = [];
const originalLog = console.log;
console.log = function(...args) {
  logs.push(args.join(' '));
  originalLog.apply(console, args);
};

// ... 执行操作 ...

// 导出日志
const logText = logs.join('\n');
console.save = function(filename) {
  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'console.log';
  a.click();
};

console.save('webread-debug.log');
```

## 获取帮助

如果问题仍未解决，请收集以下信息：

1. **浏览器信息**
   ```javascript
   console.log(navigator.userAgent);
   ```

2. **完整的控制台日志**
   - 打开 F12 控制台
   - 右键点击日志区域
   - 选择 "Save as..."

3. **WebDAV 配置**
   ```javascript
   fetch('/api/webread/webdav-config').then(r => r.json()).then(c => console.log(c));
   ```

4. **IndexedDB 状态**
   - 打开 F12 → Application → IndexedDB
   - 截图 webread-books 数据库

5. **网络请求**
   - 打开 F12 → Network
   - 重新加载页面
   - 查看是否有失败的请求
