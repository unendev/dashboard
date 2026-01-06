# WebRead 本地存储指南

## 本地存储位置

书籍和数据保存在 **IndexedDB**（浏览器内置数据库）中。

### 数据库信息

- **数据库名**: `webread-books`
- **版本**: 2
- **存储位置**: 浏览器本地（通常在用户数据目录）

### 存储表结构

| 表名 | 用途 | 数据类型 |
|------|------|--------|
| `books` | 书籍文件 | EPUB 二进制数据 (Blob) |
| `metadata` | 书籍元数据 | JSON 对象 |
| `progress` | 阅读进度 | JSON 对象 |
| `notes` | 笔记和高亮 | JSON 对象数组 |

## 数据持久化

### 浏览器关闭后是否保留？

✅ **是的，会保留**

IndexedDB 是持久化存储，浏览器关闭后数据仍然存在。

### 数据会在什么时候丢失？

❌ 以下情况会导致数据丢失：

1. **用户清除浏览器缓存**
   - 打开浏览器设置
   - 清除浏览历史/缓存
   - 选择 "Cookies and other site data"

2. **用户清除 IndexedDB**
   ```javascript
   indexedDB.deleteDatabase('webread-books');
   ```

3. **浏览器隐私模式（无痕浏览）**
   - 隐私模式下的数据在关闭后会被删除

4. **浏览器卸载或重置**
   - 卸载浏览器
   - 重置浏览器设置

5. **操作系统清理**
   - 清理临时文件
   - 清理用户数据

## 存储容量

### 配额

- **Chrome/Edge**: 通常 50% 的可用磁盘空间
- **Firefox**: 通常 10% 的可用磁盘空间
- **Safari**: 通常 50MB

### 查看使用情况

```javascript
// 查看 IndexedDB 使用情况
navigator.storage.estimate().then(estimate => {
  console.log('Storage usage:');
  console.log('  Used:', (estimate.usage / 1024 / 1024).toFixed(2), 'MB');
  console.log('  Quota:', (estimate.quota / 1024 / 1024).toFixed(2), 'MB');
  console.log('  Percentage:', ((estimate.usage / estimate.quota) * 100).toFixed(2), '%');
});
```

## 数据结构

### Books 表

```javascript
{
  id: "book-123",
  blob: Blob,  // EPUB 文件的二进制数据
  savedAt: 1703251200000  // 保存时间戳
}
```

### Metadata 表

```javascript
{
  id: "book-123",
  title: "书籍标题",
  author: "作者名",
  coverUrl: "https://...",  // 可选
  fileSize: 1234567,
  uploadDate: 1703251200000,
  lastModified: 1703251200000
}
```

### Progress 表

```javascript
{
  bookId: "book-123",
  currentCfi: "/6/4[chap01]!/4/2/16,/1:0,/1:10",  // EPUB 位置标记
  progress: 0.25,  // 0-1 之间的进度
  currentChapter: "第一章",
  lastReadAt: 1703251200000
}
```

### Notes 表

```javascript
{
  id: "note-456",
  bookId: "book-123",
  cfi: "/6/4[chap01]!/4/2/16,/1:0,/1:10",
  text: "高亮的文本",
  note: "用户的笔记内容",
  createdAt: 1703251200000,
  updatedAt: 1703251200000
}
```

## 查看本地数据

### 方法 1: 浏览器开发者工具

1. 打开 F12 开发者工具
2. 进入 "Application" 标签
3. 左侧菜单 → "IndexedDB"
4. 展开 "webread-books"
5. 查看各个表的数据

### 方法 2: 控制台脚本

```javascript
// 查看所有本地书籍
async function viewLocalBooks() {
  const dbRequest = indexedDB.open('webread-books', 2);
  
  dbRequest.onsuccess = () => {
    const db = dbRequest.result;
    const tx = db.transaction(['books', 'metadata'], 'readonly');
    
    // 获取所有书籍
    const booksStore = tx.objectStore('books');
    const booksRequest = booksStore.getAll();
    
    booksRequest.onsuccess = () => {
      console.log('Books in local storage:');
      booksRequest.result.forEach(book => {
        console.log(`  - ${book.id}: ${(book.blob.size / 1024 / 1024).toFixed(2)} MB`);
      });
    };
    
    // 获取所有元数据
    const metadataStore = tx.objectStore('metadata');
    const metadataRequest = metadataStore.getAll();
    
    metadataRequest.onsuccess = () => {
      console.log('\nMetadata:');
      metadataRequest.result.forEach(meta => {
        console.log(`  - ${meta.id}: ${meta.title} by ${meta.author}`);
      });
    };
  };
}

viewLocalBooks();
```

## 管理本地数据

### 清除所有数据

```javascript
// 清除整个 IndexedDB 数据库
indexedDB.deleteDatabase('webread-books');
console.log('All local data cleared');
location.reload();
```

### 清除特定书籍

```javascript
// 删除特定书籍
async function deleteBook(bookId) {
  const dbRequest = indexedDB.open('webread-books', 2);
  
  dbRequest.onsuccess = () => {
    const db = dbRequest.result;
    const tx = db.transaction(['books', 'metadata', 'progress', 'notes'], 'readwrite');
    
    // 删除书籍文件
    tx.objectStore('books').delete(bookId);
    
    // 删除元数据
    tx.objectStore('metadata').delete(bookId);
    
    // 删除进度
    tx.objectStore('progress').delete(bookId);
    
    // 删除笔记
    const notesStore = tx.objectStore('notes');
    const notesIndex = notesStore.index('bookId');
    notesIndex.openCursor(IDBKeyRange.only(bookId)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    tx.oncomplete = () => {
      console.log(`Book ${bookId} deleted`);
    };
  };
}

deleteBook('book-123');
```

### 导出数据

```javascript
// 导出所有本地数据为 JSON
async function exportData() {
  const dbRequest = indexedDB.open('webread-books', 2);
  
  dbRequest.onsuccess = () => {
    const db = dbRequest.result;
    const tx = db.transaction(['metadata', 'progress', 'notes'], 'readonly');
    
    const data = {
      metadata: [],
      progress: [],
      notes: []
    };
    
    // 导出元数据
    tx.objectStore('metadata').getAll().onsuccess = (event) => {
      data.metadata = event.target.result;
    };
    
    // 导出进度
    tx.objectStore('progress').getAll().onsuccess = (event) => {
      data.progress = event.target.result;
    };
    
    // 导出笔记
    tx.objectStore('notes').getAll().onsuccess = (event) => {
      data.notes = event.target.result;
      
      // 导出为 JSON 文件
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'webread-data.json';
      a.click();
    };
  };
}

exportData();
```

## 同步机制

### 本地优先策略

1. **打开书籍时**
   - 先从本地 IndexedDB 查找
   - 如果找到，立即加载（< 1秒）
   - 如果未找到，从 WebDAV 下载

2. **下载书籍时**
   - 从 WebDAV 下载到本地
   - 同时保存到 IndexedDB
   - 下次打开时直接从本地加载

3. **保存进度时**
   - 立即保存到本地 IndexedDB
   - 异步上传到 WebDAV
   - 不阻塞用户操作

### 云端同步

- **自动同步**: 进入 `/webread` 页面时自动检查云端
- **手动同步**: 点击 WebDAV 配置面板的 "Sync Books" 按钮
- **冲突处理**: 本地数据优先，云端数据作为备份

## 性能优化

### 缓存策略

- **本地缓存**: 书籍文件保存在 IndexedDB
- **内存缓存**: 当前打开的书籍保存在内存
- **LRU 清理**: 可选的最近最少使用清理策略

### 加载时间

| 场景 | 时间 |
|------|------|
| 本地缓存加载 | < 1秒 |
| 云端首次下载 | 2-5秒 |
| 后续加载 | < 1秒 |

## 故障排除

### 问题 1: 数据丢失

**原因**:
- 用户清除了浏览器缓存
- 浏览器崩溃
- 操作系统清理

**解决方案**:
- 从 WebDAV 重新同步数据
- 点击 "Sync Books" 按钮

### 问题 2: 存储空间不足

**症状**:
- 无法保存新书籍
- 错误信息: "QuotaExceededError"

**解决方案**:
```javascript
// 清除旧书籍
indexedDB.deleteDatabase('webread-books');
location.reload();
```

### 问题 3: 数据损坏

**症状**:
- 打开书籍时出错
- 进度无法保存

**解决方案**:
```javascript
// 重新初始化数据库
indexedDB.deleteDatabase('webread-books');
location.reload();
```

## 隐私和安全

### 数据隐私

- ✅ 数据存储在本地浏览器中
- ✅ 不上传到第三方服务器
- ✅ 只有当前浏览器可以访问

### 数据安全

- ⚠️ 如果浏览器被入侵，数据可能被访问
- ⚠️ 不建议在公共计算机上使用
- ✅ 建议定期备份重要数据

## 最佳实践

### 1. 定期备份

```javascript
// 定期导出数据
exportData();  // 每周一次
```

### 2. 清理旧数据

```javascript
// 删除不再使用的书籍
deleteBook('old-book-id');
```

### 3. 监控存储空间

```javascript
// 定期检查存储使用情况
navigator.storage.estimate().then(estimate => {
  if (estimate.usage / estimate.quota > 0.8) {
    console.warn('Storage usage > 80%');
  }
});
```

### 4. 使用多个浏览器

- 在不同浏览器中使用不同的账户
- 每个浏览器有独立的 IndexedDB
- 便于数据隔离和管理

---

**总结**:

✅ 本地数据保存在 IndexedDB 中
✅ 浏览器关闭后数据仍然保留
✅ 用户清除缓存后数据会丢失
✅ 可以从 WebDAV 重新同步数据
✅ 建议定期备份重要数据
