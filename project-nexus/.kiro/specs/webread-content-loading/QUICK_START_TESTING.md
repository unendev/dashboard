# WebDAV 快速测试指南

**目标**: 在 5 分钟内验证 WebDAV 集成是否正常工作

## 前置准备 (2 分钟)

### 1. 启动 WebDAV 服务器

**选项 A: 使用 Docker (推荐)**
```bash
docker run -d \
  --name webdav \
  -p 8080:80 \
  -e USERNAME=admin \
  -e PASSWORD=admin \
  -v /tmp/webdav:/data \
  easywebdav/webdav:latest
```

**选项 B: 使用 Nextcloud**
```bash
docker run -d \
  --name nextcloud \
  -p 8080:80 \
  nextcloud:latest
```

**选项 C: 使用 Synology NAS**
- 登录 NAS 管理面板
- 启用 WebDAV 服务
- 记录 URL 和端口

### 2. 验证服务器运行

```bash
# 测试连接
curl -I http://localhost:8080/webdav

# 应该返回 200 或 401 (需要认证)
```

## 测试步骤 (3 分钟)

### 步骤 1: 打开应用

1. 启动开发服务器
   ```bash
   npm run dev
   ```

2. 打开浏览器
   ```
   http://localhost:3000/webread
   ```

3. 打开开发者工具 (F12)
   - 切换到 Console 标签
   - 查看是否有错误

### 步骤 2: 配置 WebDAV

1. 点击右下角的 ⚙️ 设置按钮

2. 填写配置信息
   ```
   WebDAV URL: http://localhost:8080/webdav
   Username: admin
   Password: admin
   Ebook Path: /ebooks
   ```

3. 点击 "Test Connection" 按钮

4. 验证结果
   - ✅ 绿色: 连接成功
   - ❌ 红色: 连接失败 (查看控制台错误)

### 步骤 3: 上传测试书籍

1. 准备 EPUB 文件
   - 如果没有，可以从网络下载免费 EPUB
   - 或创建最小 EPUB 文件

2. 点击 "导入 EPUB" 按钮

3. 选择 EPUB 文件

4. 等待上传完成
   - 查看控制台日志
   - 应该看到 `[WebDAV] ✓ Book cached successfully`

### 步骤 4: 验证缓存

1. 打开浏览器控制台

2. 运行诊断命令
   ```javascript
   import * as webdavCache from '@/lib/webdav-cache';
   const stats = await webdavCache.getCacheStats();
   console.log('缓存统计:', stats);
   ```

3. 验证输出
   - `totalBooks` > 0
   - `totalSize` > 0
   - `books` 数组包含上传的书籍

### 步骤 5: 打开书籍

1. 点击上传的书籍

2. 等待加载
   - 应该看到加载动画
   - 然后显示书籍内容

3. 查看控制台日志
   - 应该看到 `[WebDAV] ✓ Book found in WebDAV cache`
   - 或 `[WebDAV] Cache miss, fetching from network...`

### 步骤 6: 验证缓存工作

1. 刷新页面 (F5)

2. 再次打开同一本书

3. 查看控制台日志
   - 应该看到 `[WebDAV] ✓ Book found in WebDAV cache`
   - 加载速度应该更快

## 验证清单

| 项目 | 状态 | 说明 |
|------|------|------|
| 配置面板打开 | ✓/✗ | 右下角设置按钮 |
| 连接测试成功 | ✓/✗ | 绿色提示 |
| 文件上传成功 | ✓/✗ | 书籍出现在列表 |
| 缓存统计正确 | ✓/✗ | totalBooks > 0 |
| 书籍打开成功 | ✓/✗ | 显示内容 |
| 缓存命中 | ✓/✗ | 第二次打开更快 |

## 常见问题

### Q: 连接测试失败

**A**: 检查以下几点
1. WebDAV 服务器是否运行
   ```bash
   docker ps | grep webdav
   ```

2. URL 是否正确
   ```bash
   curl -I http://localhost:8080/webdav
   ```

3. 用户名/密码是否正确
   ```bash
   curl -u admin:admin http://localhost:8080/webdav
   ```

### Q: 文件上传失败

**A**: 检查以下几点
1. 磁盘空间是否充足
   ```bash
   df -h
   ```

2. 权限是否正确
   ```bash
   # 检查 WebDAV 目录权限
   ls -la /tmp/webdav
   ```

3. 文件大小是否超过限制 (200 MB)

### Q: 缓存未生效

**A**: 检查以下几点
1. 配置是否保存
   ```javascript
   import { getWebDAVConfig } from '@/lib/webdav-config';
   console.log(getWebDAVConfig());
   ```

2. WebDAV 目录是否存在
   ```bash
   curl -u admin:admin -X PROPFIND http://localhost:8080/webdav/ebooks
   ```

3. 是否有权限错误
   - 查看浏览器控制台
   - 查看 WebDAV 服务器日志

## 调试技巧

### 查看详细日志

```javascript
// 在浏览器控制台运行
// 所有 WebDAV 操作都会打印 [WebDAV] 日志
// 搜索 "[WebDAV]" 查看所有相关日志
```

### 手动测试缓存

```javascript
// 在浏览器控制台运行
import * as webdavCache from '@/lib/webdav-cache';

// 测试连接
const connected = await webdavCache.testWebDAVConnection();
console.log('连接测试:', connected);

// 获取缓存统计
const stats = await webdavCache.getCacheStats();
console.log('缓存统计:', stats);

// 获取使用率
const usage = await webdavCache.getCacheUsagePercent();
console.log('使用率:', usage + '%');

// 列出所有书籍
const books = await webdavCache.getAllBooks();
console.log('缓存书籍:', books);
```

### 查看网络请求

1. 打开开发者工具 (F12)
2. 切换到 Network 标签
3. 过滤 WebDAV 请求
4. 查看请求/响应详情

### 清理缓存

```javascript
// 在浏览器控制台运行
import * as webdavCache from '@/lib/webdav-cache';

// 清空所有缓存
await webdavCache.clearAllBooks();
console.log('缓存已清空');
```

## 性能测试

### 测试缓存速度

```javascript
// 在浏览器控制台运行
import * as webdavCache from '@/lib/webdav-cache';

// 测试缓存读取速度
const bookId = 'your-book-id';
const start = performance.now();
const blob = await webdavCache.getBook(bookId);
const end = performance.now();

console.log('缓存读取时间:', (end - start).toFixed(2) + 'ms');
console.log('文件大小:', blob?.size || 0, 'bytes');
```

### 测试 LRU 清理

```javascript
// 在浏览器控制台运行
import * as webdavCache from '@/lib/webdav-cache';

// 获取清理前的统计
const before = await webdavCache.getCacheStats();
console.log('清理前:', before);

// 手动触发清理 (上传大文件)
// ...

// 获取清理后的统计
const after = await webdavCache.getCacheStats();
console.log('清理后:', after);
```

## 下一步

### 如果测试成功 ✅
1. 阅读 `IMPLEMENTATION_STATUS_V2.md` 了解详细信息
2. 查看 `PAGE_CONFIG_GUIDE.md` 了解配置选项
3. 部署到生产环境

### 如果测试失败 ❌
1. 查看 `TROUBLESHOOTING.md` 故障排除指南
2. 收集诊断信息
3. 检查浏览器控制台和 WebDAV 服务器日志

## 相关文档

- `TROUBLESHOOTING.md` - 故障排除指南
- `IMPLEMENTATION_STATUS_V2.md` - 详细实现状态
- `PAGE_CONFIG_GUIDE.md` - 配置使用指南
- `INSTALLATION.md` - 服务器部署指南

---

**预计时间**: 5 分钟  
**难度**: 简单  
**所需工具**: 浏览器, Docker (可选)
