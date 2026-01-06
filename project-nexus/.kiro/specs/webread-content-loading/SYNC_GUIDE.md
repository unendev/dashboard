# WebDAV 同步指南

## 概述

新的 WebDAV 同步系统采用 **本地优先 + 云端同步** 策略：

- **本地存储**：IndexedDB（浏览器本地数据库）
- **云端存储**：WebDAV 服务器（如 Nextcloud、Synology NAS 等）
- **同步方向**：双向（上传新书到云端，下载云端书籍到本地）

## 工作流程

### 1. 进入书架页面

```
用户访问 /webread
  ↓
自动调用 syncBooksFromCloud()
  ↓
检查云端 /anx/data/file/ 目录
  ↓
列出所有 .epub 文件
  ↓
对比本地 IndexedDB 中已有的书籍
  ↓
下载缺失的书籍到本地
  ↓
完成，显示书架
```

### 2. 上传新书

```
用户选择 EPUB 文件
  ↓
创建数据库记录（获取 bookId）
  ↓
保存到本地 IndexedDB
  ↓
异步上传到 WebDAV 云端
  ↓
完成
```

### 3. 阅读书籍

```
用户点击书籍
  ↓
从本地 IndexedDB 读取
  ↓
如果本地无则从云端下载
  ↓
用 EpubJS 渲染
  ↓
保存阅读进度到数据库
```

### 4. 删除书籍

```
用户点击删除
  ↓
删除数据库记录
  ↓
删除本地 IndexedDB 中的文件
  ↓
删除云端 WebDAV 中的文件
  ↓
完成
```

## 配置

### 环境变量 (.env)

```env
# WebDAV 配置
WEBDAV_URL="http://localhost:8080/webdav"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="admin"
WEBDAV_EBOOK_PATH="/anx/data/file"
```

### 常见 WebDAV 服务器配置

**Nextcloud:**
```
URL: http://your-nextcloud.com/remote.php/dav/files/admin
Path: /ebooks
```

**Synology NAS:**
```
URL: https://your-nas.com:5006
Path: /ebooks
```

**自建 WebDAV 服务器:**
```
URL: http://your-server.com:8080/webdav
Path: /ebooks
```

## 手动同步

### 通过配置面板

1. 点击右下角的 ⚙️ 设置按钮
2. 输入 WebDAV 配置
3. 点击 "Test Connection" 测试连接
4. 点击 "Sync Books" 手动同步
5. 查看同步结果

### 通过浏览器控制台

```javascript
// 导入同步函数
import * as webdavCache from '@/lib/webdav-cache';

// 执行同步
const result = await webdavCache.syncBooksFromCloud();
console.log('同步结果:', result);
// 输出: { synced: 3, failed: 0, total: 5 }
```

## 存储结构

### 本地 IndexedDB

```
Database: webread-books
Store: books
  ├── bookId (key)
  ├── blob (EPUB 文件内容)
  ├── title
  ├── syncedAt (同步时间戳)
  └── lastAccessAt (最后访问时间)
```

### 云端 WebDAV

```
/anx/data/file/
  ├── {bookId}.epub (书籍文件)
  ├── {bookId}.epub.meta (元数据，可选)
  └── ...
```

### 数据库 (Prisma)

```
Book
  ├── id (bookId)
  ├── title
  ├── author
  ├── fileSize
  ├── coverUrl
  ├── fileUrl (已弃用，现为空)
  ├── userId
  ├── uploadDate
  └── readingProgress[]
```

## 故障排除

### 问题：同步时显示 "连接失败"

**解决方案：**
1. 检查 WebDAV 服务器是否在线
2. 验证 URL、用户名、密码是否正确
3. 检查防火墙是否允许连接
4. 查看浏览器控制台的错误信息

### 问题：书籍下载很慢

**解决方案：**
1. 检查网络连接速度
2. 减少同时下载的书籍数量
3. 考虑在 WebDAV 服务器上启用压缩

### 问题：本地存储满了

**解决方案：**
1. 打开浏览器开发者工具
2. 执行：`await webdavCache.clearAllLocalBooks()`
3. 重新同步需要的书籍

### 问题：某本书籍无法同步

**解决方案：**
1. 检查文件是否真的存在于 WebDAV
2. 检查文件名是否为 `{bookId}.epub` 格式
3. 检查文件是否损坏
4. 查看浏览器控制台的详细错误

## 性能优化

### 本地缓存

- 首次读取时从云端下载到本地
- 后续读取直接从本地 IndexedDB 读取（极快）
- 自动更新最后访问时间

### 异步上传

- 上传新书时，先保存到本地（快速响应）
- 然后异步上传到云端（不阻塞 UI）
- 即使上传失败也不影响本地使用

### 增量同步

- 只同步本地没有的书籍
- 避免重复下载
- 支持断点续传（WebDAV 协议特性）

## API 参考

### 获取书籍

```typescript
// 本地优先，本地无则从云端下载
const blob = await webdavCache.getBook(bookId);
```

### 上传书籍

```typescript
// 同时写入本地和云端
await webdavCache.setBook(bookId, blob, title);
```

### 删除书籍

```typescript
// 同时删除本地和云端
await webdavCache.deleteBook(bookId);
```

### 同步云端书籍

```typescript
// 检查云端有哪些书籍，本地没有的就下载
const result = await webdavCache.syncBooksFromCloud();
// 返回: { synced: number, failed: number, total: number }
```

### 获取本地书籍列表

```typescript
const books = await webdavCache.getAllLocalBooks();
// 返回: SyncBook[]
```

### 清空本地存储

```typescript
await webdavCache.clearAllLocalBooks();
```

### 获取存储统计

```typescript
const stats = await webdavCache.getLocalStorageStats();
// 返回: { totalSize: number, totalBooks: number }
```

## 最佳实践

1. **定期同步**：每次进入书架页面时自动同步
2. **备份重要书籍**：确保 WebDAV 服务器有备份
3. **监控存储空间**：定期检查本地和云端的存储使用情况
4. **测试连接**：在配置 WebDAV 后立即测试连接
5. **渐进式加载**：大量书籍时分批同步，避免一次性加载

## 常见问题

**Q: 本地和云端的书籍不一致怎么办？**
A: 点击 "Sync Books" 按钮重新同步，本地没有的会从云端下载。

**Q: 能否只在云端存储，不在本地缓存？**
A: 可以，但会影响性能。建议保留本地缓存以获得最佳体验。

**Q: 多设备同步是否支持？**
A: 支持。每台设备都会从同一个 WebDAV 服务器同步书籍。

**Q: 离线时能否阅读书籍？**
A: 可以。只要书籍已经下载到本地 IndexedDB，就可以离线阅读。

**Q: 如何迁移旧的 OSS 书籍？**
A: 需要手动将 OSS 中的 EPUB 文件下载后重新上传到 WebDAV。
