# WebRead 转圈加载器问题 - 调试指南

## 问题

打开书籍后加载器一直转圈，不消失。

## 快速诊断

在浏览器 F12 控制台中运行以下命令：

### 1. 检查浏览器日志

```javascript
// 打开 F12 → Console
// 打开书籍
// 查看是否有以下日志：

// 应该看到：
[EpubReader] Starting book load for bookId: xxx
[WebDAV] Getting book: xxx
[WebDAV] ✓ Book found in local cache
// 或
[WebDAV] Book not in local cache, fetching from cloud...

// 最后应该看到：
[EpubReader] ✓ Book ready for reading
```

### 2. 检查是否有错误

```javascript
// 查看控制台中是否有红色错误消息
// 常见错误：
// - "书籍未找到，请确认已上传到 WebDAV"
// - "Display timeout after 5s"
// - "Local fetch timeout"
// - "Cloud fetch timeout"
```

### 3. 检查 IndexedDB 状态

```javascript
// 检查 IndexedDB 是否正常
indexedDB.databases().then(dbs => {
  console.log('Available databases:', dbs);
  
  // 应该看到 webread-books 数据库
  const dbRequest = indexedDB.open('webread-books', 2);
  dbRequest.onsuccess = () => {
    const db = dbRequest.result;
    console.log('Object stores:', Array.from(db.objectStoreNames));
    // 应该看到: books, metadata, progress, notes
  };
});
```

### 4. 检查 WebDAV 配置

```javascript
// 检查 WebDAV 配置是否正确
fetch('/api/webread/webdav-config')
  .then(r => r.json())
  .then(config => {
    console.log('WebDAV Config:', {
      url: config.url,
      username: config.username,
      ebookPath: config.ebookPath,
    });
  });
```

### 5. 测试 WebDAV 连接

```javascript
// 测试 WebDAV 连接
async function testWebDAV() {
  try {
    const config = await fetch('/api/webread/webdav-config').then(r => r.json());
    console.log('Testing WebDAV connection...');
    
    // 尝试连接
    const response = await fetch(config.url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': 'Basic ' + btoa(config.username + ':' + config.password),
        'Depth': '0'
      }
    });
    
    if (response.ok || response.status === 207) {
      console.log('✓ WebDAV connection successful');
    } else {
      console.log('✗ WebDAV connection failed:', response.status);
    }
  } catch (e) {
    console.error('Error testing WebDAV:', e);
  }
}

testWebDAV();
```

## 常见原因和解决方案

### 原因 1: IndexedDB 卡住

**症状**:
- 日志显示 `[WebDAV] Getting book: xxx`
- 然后没有后续日志
- 加载器一直转圈

**解决方案**:
```javascript
// 清除 IndexedDB
indexedDB.deleteDatabase('webread-books');
location.reload();
```

### 原因 2: WebDAV 连接失败

**症状**:
- 日志显示 `[WebDAV] Book not in local cache, fetching from cloud...`
- 然后没有后续日志
- 加载器一直转圈

**解决方案**:
1. 检查 WebDAV 配置（右下角齿轮图标）
2. 点击 "Test Connection"
3. 如果失败，检查：
   - WebDAV URL 是否正确
   - 用户名和密码是否正确
   - WebDAV 服务器是否在线

### 原因 3: 书籍文件不存在

**症状**:
- 日志显示 `[WebDAV] Book not found in cloud: xxx`
- 显示错误信息："书籍未找到，请确认已上传到 WebDAV"

**解决方案**:
1. 登录 WebDAV 服务器
2. 检查 `/anx/data/file/` 目录
3. 确认书籍 `.epub` 文件存在
4. 文件名应该是 `{bookId}.epub`

### 原因 4: EpubJS 初始化失败

**症状**:
- 日志显示 `[EpubReader] Initializing EpubJS Book...`
- 然后没有 `✓ Book initialized` 日志
- 加载器一直转圈

**解决方案**:
1. 检查书籍文件是否是有效的 EPUB 格式
2. 尝试用其他 EPUB 阅读器打开该文件
3. 如果文件损坏，重新上传

### 原因 5: Rendition 初始化失败

**症状**:
- 日志显示 `[EpubReader] Creating rendition...`
- 然后没有 `✓ Rendition created` 日志
- 加载器一直转圈

**解决方案**:
1. 检查浏览器是否支持 EpubJS
2. 尝试用其他浏览器
3. 清除浏览器缓存

### 原因 6: Display 卡住

**症状**:
- 日志显示 `[EpubReader] Displaying content at location: start`
- 然后没有 `✓ Content displayed` 日志
- 加载器一直转圈

**解决方案**:
- 这是正常的，应该在 5 秒后超时
- 如果超过 8 秒仍未恢复，可能是浏览器问题
- 尝试刷新页面或用其他浏览器

## 完整诊断脚本

```javascript
// 运行完整诊断
async function diagnoseWebRead() {
  console.log('=== WebRead 诊断开始 ===\n');
  
  // 1. 检查 IndexedDB
  console.log('1. 检查 IndexedDB...');
  try {
    const dbs = await indexedDB.databases();
    console.log('   Available databases:', dbs.map(d => d.name));
    
    const dbRequest = indexedDB.open('webread-books', 2);
    await new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        console.log('   ✓ webread-books database opened');
        console.log('   Object stores:', Array.from(db.objectStoreNames));
        
        // 检查 books 表
        const tx = db.transaction(['books'], 'readonly');
        const store = tx.objectStore('books');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          console.log('   Books in IndexedDB:', getAllRequest.result.length);
          resolve(null);
        };
      };
      dbRequest.onerror = () => {
        console.log('   ✗ Failed to open database');
        reject(dbRequest.error);
      };
    });
  } catch (e) {
    console.error('   ✗ IndexedDB error:', e);
  }
  
  // 2. 检查 WebDAV 配置
  console.log('\n2. 检查 WebDAV 配置...');
  try {
    const config = await fetch('/api/webread/webdav-config').then(r => r.json());
    console.log('   ✓ WebDAV Config loaded');
    console.log('   URL:', config.url);
    console.log('   Username:', config.username);
    console.log('   Ebook Path:', config.ebookPath);
  } catch (e) {
    console.error('   ✗ Failed to load config:', e);
  }
  
  // 3. 检查 WebDAV 连接
  console.log('\n3. 检查 WebDAV 连接...');
  try {
    const config = await fetch('/api/webread/webdav-config').then(r => r.json());
    const response = await fetch(config.url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': 'Basic ' + btoa(config.username + ':' + config.password),
        'Depth': '0'
      }
    });
    
    if (response.ok || response.status === 207) {
      console.log('   ✓ WebDAV connection successful');
    } else {
      console.log('   ✗ WebDAV connection failed:', response.status);
    }
  } catch (e) {
    console.error('   ✗ WebDAV connection error:', e);
  }
  
  // 4. 检查浏览器支持
  console.log('\n4. 检查浏览器支持...');
  console.log('   User Agent:', navigator.userAgent);
  console.log('   IndexedDB supported:', !!window.indexedDB);
  console.log('   Blob supported:', !!window.Blob);
  console.log('   ArrayBuffer supported:', !!window.ArrayBuffer);
  
  console.log('\n=== 诊断完成 ===');
}

// 运行诊断
diagnoseWebRead();
```

## 如果仍然无法解决

请收集以下信息并联系开发团队：

1. **完整的浏览器控制台日志**
   - 打开 F12 → Console
   - 右键点击日志区域
   - 选择 "Save as..."

2. **浏览器信息**
   ```javascript
   console.log(navigator.userAgent);
   ```

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

## 预期日志

### 正常情况（本地缓存）

```
[EpubReader] Starting book load for bookId: book-123
[WebDAV] Getting book: book-123
[WebDAV] ✓ Book found in local cache
[EpubReader] ✓ Book loaded from WebDAV, size: 1234567
[EpubReader] Initializing EpubJS Book...
[EpubReader] ✓ Book initialized
[EpubReader] Creating rendition...
[EpubReader] ✓ Rendition created
[EpubReader] Displaying content at location: start
[EpubReader] ✓ Content displayed
[EpubReader] Applying styles...
[EpubReader] Styles applied successfully { theme: 'light', fontSize: 18 }
[EpubReader] Setting up event listeners...
[EpubReader] ✓ Book ready for reading
```

### 云端获取情况

```
[EpubReader] Starting book load for bookId: book-456
[WebDAV] Getting book: book-456
[WebDAV] Book not in local cache, fetching from cloud...
[WebDAV] ✓ Book fetched from cloud, caching locally...
[EpubReader] ✓ Book loaded from WebDAV, size: 5678901
...
[EpubReader] ✓ Book ready for reading
```

### 超时恢复情况

```
[EpubReader] Displaying content at location: start
[EpubReader] Display error (will continue): Error: Display timeout after 5s
[EpubReader] ✓ Content displayed
...
[EpubReader] Display timeout, forcing ready state
[EpubReader] ✓ Book ready for reading
```

---

**修复状态**: ✅ 已修复

**建议**: 按照上述步骤进行诊断
