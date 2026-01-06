# WebDAV 存储安装指南

## 前置要求

- Node.js >= 18.0.0
- pnpm >= 10.0.0
- WebDAV 服务器（Nextcloud、Synology 或自建）

## 安装步骤

### 1. 安装依赖

```bash
# 安装 webdav 包
pnpm install webdav

# 或者更新所有依赖
pnpm install
```

### 2. 配置环境变量

编辑 `.env` 文件，添加 WebDAV 配置：

```env
# WebDAV 配置（用于 EPUB 文件存储）
WEBDAV_URL="http://localhost:8080/webdav"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="admin"
WEBDAV_EBOOK_PATH="/ebooks"
```

### 3. 部署 WebDAV 服务器

选择以下任一方式部署 WebDAV 服务器：

#### 方式 A：使用 Docker Compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  webdav:
    image: nextcloud:latest
    ports:
      - "8080:80"
    environment:
      NEXTCLOUD_ADMIN_USER: admin
      NEXTCLOUD_ADMIN_PASSWORD: admin
      NEXTCLOUD_TRUSTED_DOMAINS: localhost
    volumes:
      - nextcloud_data:/var/www/html
      - nextcloud_config:/var/www/html/config
    restart: unless-stopped

volumes:
  nextcloud_data:
  nextcloud_config:
```

启动服务：

```bash
docker-compose up -d
```

#### 方式 B：使用 Synology NAS

1. 登录 Synology DSM
2. 打开 Package Center
3. 搜索并安装 "WebDAV Server"
4. 在 WebDAV Server 中创建共享文件夹 `/ebooks`
5. 配置 `.env`：

```env
WEBDAV_URL="https://your-nas.example.com:5006"
WEBDAV_USERNAME="your_username"
WEBDAV_PASSWORD="your_password"
WEBDAV_EBOOK_PATH="/ebooks"
```

#### 方式 C：自建 WebDAV 服务器

使用 `wsgidav`：

```bash
# 安装 Python 和 wsgidav
pip install wsgidav

# 创建存储目录
mkdir -p /var/webdav/ebooks

# 启动服务
wsgidav --host=0.0.0.0 --port=8080 --root=/var/webdav --auth=basic --user=admin --password=admin
```

### 4. 测试连接

在项目中测试 WebDAV 连接：

```typescript
// 在浏览器控制台或测试文件中运行
import * as webdavCache from '@/lib/webdav-cache';

const isConnected = await webdavCache.testWebDAVConnection();
console.log('WebDAV connected:', isConnected);

// 获取缓存统计
const stats = await webdavCache.getCacheStats();
console.log('Cache stats:', stats);
```

### 5. 启动应用

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

## 验证安装

### 检查点 1：WebDAV 连接

打开浏览器控制台，应该看到：

```
[WebDAV] Client initialized successfully
[WebDAV] Directory exists: /ebooks
```

### 检查点 2：上传书籍

1. 打开 WebRead 页面
2. 点击"导入 EPUB"按钮
3. 选择一个 EPUB 文件
4. 等待上传完成

控制台应该显示：

```
[WebDAV] Caching book: { bookId: 'xxx', title: 'Book Title', size: 2048576 }
[WebDAV] ✓ Book cached successfully
```

### 检查点 3：打开书籍

1. 点击已上传的书籍
2. 等待内容加载

控制台应该显示：

```
[EpubReader] Starting book load for bookId: xxx
[EpubReader] Checking WebDAV cache...
[EpubReader] ✓ Book found in WebDAV cache
[EpubReader] ✓ Content displayed
```

## 故障排除

### 问题 1：`Cannot find module 'webdav'`

**解决**：
```bash
pnpm install webdav
```

### 问题 2：WebDAV 连接失败

**检查清单**：
- [ ] WebDAV 服务器是否运行？
- [ ] `WEBDAV_URL` 是否正确？
- [ ] 用户名和密码是否正确？
- [ ] 防火墙是否允许连接？

**调试**：
```bash
# 测试 WebDAV 服务器连接
curl -u admin:admin http://localhost:8080/webdav/

# 应该返回 200 OK
```

### 问题 3：权限错误

**症状**：`403 Forbidden`

**解决**：
1. 检查用户权限
2. 确保目录存在
3. 检查 WebDAV 服务器配置

```bash
# 创建目录（如果不存在）
mkdir -p /var/webdav/ebooks
chmod 755 /var/webdav/ebooks
```

### 问题 4：超时错误

**症状**：`timeout`

**解决**：
1. 检查网络连接
2. 检查 WebDAV 服务器性能
3. 增加超时时间

## 性能优化

### 1. 启用 HTTPS

在生产环境中使用 HTTPS：

```env
WEBDAV_URL="https://your-server.com/webdav"
```

### 2. 启用压缩

在 WebDAV 服务器上启用 gzip 压缩：

```nginx
# Nginx 配置
gzip on;
gzip_types application/epub+zip;
gzip_min_length 1000;
```

### 3. 使用 CDN

如果 WebDAV 服务器在远程位置，考虑使用 CDN 加速

## 备份和恢复

### 备份 WebDAV 数据

```bash
# 使用 rsync 备份
rsync -av /var/webdav/ebooks /backup/ebooks

# 使用 tar 备份
tar -czf ebooks_backup.tar.gz /var/webdav/ebooks
```

### 恢复数据

```bash
# 从备份恢复
rsync -av /backup/ebooks /var/webdav/

# 或者
tar -xzf ebooks_backup.tar.gz -C /var/webdav
```

## 监控和维护

### 监控存储使用

```typescript
// 定期检查存储使用情况
const stats = await webdavCache.getCacheStats();
const usagePercent = await webdavCache.getCacheUsagePercent();

console.log(`Storage usage: ${usagePercent.toFixed(2)}%`);
console.log(`Total books: ${stats.totalBooks}`);
console.log(`Total size: ${webdavCache.formatFileSize(stats.totalSize)}`);
```

### 清理过期数据

```typescript
// 自动清理最久未访问的书籍
// 当缓存达到 90% 时自动触发
// 清理 20% 的最久未访问的书籍
```

## 常见问题

### Q: 可以在多个设备上使用同一个 WebDAV 服务器吗？

**A**: 是的，这是 WebDAV 的主要优势。多个设备可以共享同一个 WebDAV 服务器上的书籍缓存。

### Q: 如何迁移现有的 IndexedDB 数据？

**A**: 参考 `WEBDAV_MIGRATION.md` 中的迁移步骤。

### Q: WebDAV 服务器需要多少存储空间？

**A**: 取决于你的书籍数量和大小。一般来说，EPUB 文件大小在 1-10MB 之间。建议至少预留 500GB 的存储空间。

### Q: 如何处理网络离线的情况？

**A**: 当网络离线时，系统会自动使用本地缓存。如果本地没有缓存，则无法打开书籍。

### Q: 如何更改 WebDAV 密码？

**A**: 
1. 在 WebDAV 服务器上更改密码
2. 更新 `.env` 中的 `WEBDAV_PASSWORD`
3. 重启应用

## 下一步

- 阅读 `WEBDAV_MIGRATION.md` 了解迁移详情
- 阅读 `QUICK_REFERENCE.md` 了解快速参考
- 查看 `COMPLETION_REPORT.md` 了解完整的实现报告

---

**更新日期**：2025-12-16
**状态**：✅ 安装指南完成

