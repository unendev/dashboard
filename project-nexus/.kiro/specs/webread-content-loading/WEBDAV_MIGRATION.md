# WebDAV 存储迁移指南

## 概述

已将 WebRead 的存储机制从 **IndexedDB** 迁移到 **WebDAV**。这提供了以下优势：

- ✅ **跨设备同步**：书籍缓存可以在多个设备间同步
- ✅ **更好的存储管理**：集中式存储，易于备份和管理
- ✅ **离线访问**：支持离线阅读缓存的书籍
- ✅ **灵活的部署**：可以使用任何 WebDAV 服务器（Nextcloud、Synology、自建等）

## 当前存储逻辑

### 之前（IndexedDB）
```
浏览器 IndexedDB
├── 存储位置：浏览器本地
├── 容量：通常 50MB-1GB
├── 跨设备：❌ 不支持
└── 备份：❌ 困难
```

### 现在（WebDAV）
```
WebDAV 服务器
├── 存储位置：远程服务器
├── 容量：取决于服务器配置
├── 跨设备：✅ 支持
└── 备份：✅ 容易
```

## 环境配置

### 1. 添加 WebDAV 环境变量

在 `.env` 文件中添加：

```env
# WebDAV 配置（用于 EPUB 文件存储）
WEBDAV_URL="http://localhost:8080/webdav"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="admin"
WEBDAV_EBOOK_PATH="/ebooks"
```

### 2. 配置参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `WEBDAV_URL` | WebDAV 服务器地址 | `http://localhost:8080/webdav` |
| `WEBDAV_USERNAME` | 用户名 | `admin` |
| `WEBDAV_PASSWORD` | 密码 | `admin` |
| `WEBDAV_EBOOK_PATH` | 电子书存储路径 | `/ebooks` |

## WebDAV 服务器部署

### 选项 1：使用 Nextcloud（推荐）

```bash
# Docker 部署
docker run -d \
  -p 8080:80 \
  -v nextcloud_data:/var/www/html \
  -e NEXTCLOUD_ADMIN_USER=admin \
  -e NEXTCLOUD_ADMIN_PASSWORD=admin \
  nextcloud:latest
```

配置 `.env`：
```env
WEBDAV_URL="http://localhost:8080/remote.php/dav/files/admin"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="admin"
WEBDAV_EBOOK_PATH="/ebooks"
```

### 选项 2：使用 Synology NAS

1. 在 Synology 中启用 WebDAV 服务
2. 配置 `.env`：
```env
WEBDAV_URL="https://nas.example.com:5006"
WEBDAV_USERNAME="your_username"
WEBDAV_PASSWORD="your_password"
WEBDAV_EBOOK_PATH="/ebooks"
```

### 选项 3：自建 WebDAV 服务器

使用 `wsgidav`：

```bash
# 安装
pip install wsgidav

# 创建配置文件 wsgidav.yaml
mkdir -p /var/webdav/ebooks
wsgidav --host=0.0.0.0 --port=8080 --root=/var/webdav
```

配置 `.env`：
```env
WEBDAV_URL="http://localhost:8080"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="admin"
WEBDAV_EBOOK_PATH="/ebooks"
```

## 代码变更

### 1. 新增模块：`lib/webdav-cache.ts`

提供以下 API：

```typescript
// 获取缓存的书籍
export async function getBook(bookId: string): Promise<Blob | null>

// 缓存书籍
export async function setBook(
  bookId: string,
  fileUrl: string,
  blob: Blob,
  title: string
): Promise<void>

// 删除书籍
export async function deleteBook(bookId: string): Promise<void>

// 获取所有缓存的书籍
export async function getAllBooks(): Promise<CachedBook[]>

// 获取缓存统计
export async function getCacheStats(): Promise<CacheStats>

// 检查 WebDAV 是否可用
export function isWebDAVSupported(): boolean

// 测试连接
export async function testWebDAVConnection(): Promise<boolean>
```

### 2. 修改的文件

#### `app/components/features/webread/EpubReader.tsx`
```typescript
// 之前
import * as ebookCache from '@/lib/ebook-cache';
if (ebookCache.isIndexedDBSupported()) {
  const cachedBlob = await ebookCache.getBook(bookId);
}

// 现在
import * as webdavCache from '@/lib/webdav-cache';
if (webdavCache.isWebDAVSupported()) {
  const cachedBlob = await webdavCache.getBook(bookId);
}
```

#### `app/webread/page.tsx`
```typescript
// 之前
if (ebookCache.isIndexedDBSupported()) {
  await ebookCache.setBook(newBook.id, newBook.fileUrl, file, newBook.title);
}

// 现在
if (webdavCache.isWebDAVSupported()) {
  await webdavCache.setBook(newBook.id, newBook.fileUrl, file, newBook.title);
}
```

## 调试日志

现在可以在浏览器控制台看到 WebDAV 操作的详细日志：

```
[WebDAV] Client initialized successfully
[WebDAV] Directory exists: /ebooks
[WebDAV] Attempting to retrieve book: book-123
[WebDAV] ✓ Book found, size: 2048576
[WebDAV] Caching book: { bookId: 'book-123', title: 'My Book', size: 2048576 }
[WebDAV] ✓ Book cached successfully
[WebDAV] Listing all cached books...
[WebDAV] Found 5 cached books
```

## 性能对比

| 操作 | IndexedDB | WebDAV |
|------|-----------|--------|
| 缓存检查 | < 100ms | 100-500ms |
| 文件读取 | < 500ms | 500ms-2s |
| 文件写入 | < 1s | 1-5s |
| 跨设备同步 | ❌ 不支持 | ✅ 支持 |
| 存储容量 | 50MB-1GB | 取决于服务器 |

## 迁移步骤

### 1. 备份现有数据

```typescript
// 从 IndexedDB 导出所有书籍
const books = await ebookCache.getAllBooks();
// 手动保存到文件或其他位置
```

### 2. 更新环境变量

在 `.env` 中添加 WebDAV 配置

### 3. 部署 WebDAV 服务器

选择上述任一选项部署 WebDAV 服务器

### 4. 测试连接

```typescript
import * as webdavCache from '@/lib/webdav-cache';

const isConnected = await webdavCache.testWebDAVConnection();
console.log('WebDAV connected:', isConnected);
```

### 5. 迁移数据

```typescript
// 从 IndexedDB 读取，写入 WebDAV
const books = await ebookCache.getAllBooks();
for (const book of books) {
  const blob = await ebookCache.getBook(book.bookId);
  if (blob) {
    await webdavCache.setBook(book.bookId, book.fileUrl, blob, book.title);
  }
}
```

## 故障排除

### 问题 1：连接失败

**症状**：`[WebDAV] Failed to initialize client`

**解决**：
1. 检查 `WEBDAV_URL` 是否正确
2. 检查 WebDAV 服务器是否运行
3. 检查用户名和密码是否正确
4. 检查防火墙设置

### 问题 2：权限错误

**症状**：`[WebDAV] Failed to cache book: 403 Forbidden`

**解决**：
1. 检查用户是否有写入权限
2. 检查目录是否存在
3. 检查 WebDAV 服务器的权限配置

### 问题 3：超时

**症状**：`[WebDAV] Failed to get book: timeout`

**解决**：
1. 检查网络连接
2. 检查 WebDAV 服务器性能
3. 增加超时时间（如果需要）

## 最佳实践

1. **定期备份**：定期备份 WebDAV 服务器上的数据
2. **监控存储**：使用 `getCacheStats()` 监控存储使用情况
3. **清理过期数据**：使用 LRU 策略自动清理最久未访问的书籍
4. **安全连接**：在生产环境中使用 HTTPS
5. **认证**：使用强密码和定期更换密码

## 性能优化

### 1. 启用压缩

在 WebDAV 服务器上启用 gzip 压缩：

```nginx
# Nginx 配置
gzip on;
gzip_types application/epub+zip;
```

### 2. 启用缓存

在客户端启用 HTTP 缓存：

```typescript
// 在 fetch 请求中添加缓存头
const response = await fetch(url, {
  headers: {
    'Cache-Control': 'max-age=86400'
  }
});
```

### 3. 使用 CDN

如果 WebDAV 服务器在远程位置，考虑使用 CDN 加速

## 监控和日志

### 启用详细日志

```typescript
// 在 webdav-cache.ts 中添加
const DEBUG = process.env.DEBUG_WEBDAV === 'true';

if (DEBUG) {
  console.log('[WebDAV] Detailed operation log...');
}
```

### 监控指标

```typescript
// 获取缓存统计
const stats = await webdavCache.getCacheStats();
console.log('Cache stats:', {
  totalSize: webdavCache.formatFileSize(stats.totalSize),
  totalBooks: stats.totalBooks,
  usagePercent: await webdavCache.getCacheUsagePercent(),
});
```

## 总结

WebDAV 迁移提供了更好的跨设备同步和存储管理能力。通过正确配置和部署，可以实现：

- ✅ 多设备间的书籍缓存同步
- ✅ 集中式存储和备份
- ✅ 灵活的部署选项
- ✅ 更好的存储管理

---

**更新日期**：2025-12-16
**状态**：✅ 已完成迁移

