# WebDAV 集成故障排除指南

## 常见问题

### 1. 连接失败: `net::ERR_CONNECTION_REFUSED`

**症状**:
```
[WebDAV] Failed to ensure directory exists: TypeError: Failed to fetch
[WebDAV] Creating directory: /ebooks:8080/webdav/ebooks/
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

**原因**:
- WebDAV 服务器未启动
- URL 配置错误
- 防火墙阻止连接
- 代理设置问题

**解决步骤**:

1. **验证 WebDAV 服务器运行**
   ```bash
   # 如果使用 Docker
   docker ps | grep webdav
   
   # 如果使用 Nextcloud
   curl -I http://localhost:8080/webdav
   ```

2. **检查配置面板**
   - 点击右下角设置按钮
   - 验证 URL 格式: `http://host:port/path`
   - 点击 "Test Connection" 按钮
   - 查看测试结果

3. **验证网络连接**
   ```bash
   # 测试 DNS
   nslookup localhost
   
   # 测试端口
   telnet localhost 8080
   ```

4. **检查代理设置**
   - `.env` 中的 `HTTP_PROXY` 和 `HTTPS_PROXY` 可能干扰
   - 尝试临时禁用代理测试

5. **查看浏览器控制台**
   - 打开开发者工具 (F12)
   - 查看 Console 标签
   - 查看 Network 标签中的请求

### 2. 认证失败

**症状**:
```
[WebDAV] Failed to initialize client: Error: Unauthorized
```

**原因**:
- 用户名/密码错误
- WebDAV 服务器认证方式不同
- 用户权限不足

**解决步骤**:

1. **验证凭证**
   ```bash
   # 使用 curl 测试
   curl -u admin:admin http://localhost:8080/webdav
   ```

2. **检查 WebDAV 服务器配置**
   - Nextcloud: 用户必须存在且启用
   - Synology: 检查 WebDAV 服务是否启用
   - 自建: 验证认证配置

3. **更新配置**
   - 打开配置面板
   - 输入正确的用户名和密码
   - 点击 "Test Connection"

### 3. 权限错误

**症状**:
```
[WebDAV] Failed to ensure directory exists: Error: Forbidden
```

**原因**:
- 用户无写入权限
- 目录权限设置不正确
- WebDAV 服务器限制

**解决步骤**:

1. **检查用户权限**
   ```bash
   # Nextcloud
   # 登录管理面板 → 用户 → 检查权限
   
   # Synology
   # 控制面板 → 共享文件夹 → 编辑权限
   ```

2. **创建目录**
   - 手动在 WebDAV 服务器上创建 `/ebooks` 目录
   - 确保用户有读写权限

3. **修改路径**
   - 如果 `/ebooks` 无权限，尝试其他路径
   - 例如: `/home/admin/ebooks`

### 4. 文件上传失败

**症状**:
```
[WebDAV] Failed to cache book: Error: Request failed
```

**原因**:
- 磁盘空间不足
- 文件大小超过限制
- 网络中断
- WebDAV 服务器超时

**解决步骤**:

1. **检查磁盘空间**
   ```bash
   # 查看 WebDAV 服务器磁盘使用
   df -h /path/to/webdav
   ```

2. **检查文件大小**
   - 最大缓存: 200 MB
   - 单个文件应 < 100 MB
   - 如果超过，考虑增加 `MAX_CACHE_SIZE`

3. **检查网络**
   - 测试网络连接
   - 查看浏览器网络标签
   - 检查是否有超时

4. **增加超时时间**
   - 编辑 `lib/webdav-cache.ts`
   - 增加 WebDAV 客户端超时配置

### 5. 缓存未生效

**症状**:
- 每次打开书籍都重新下载
- 缓存统计显示 0 字节
- 没有 `.meta` 文件

**原因**:
- WebDAV 配置未保存
- 缓存目录不存在
- 权限问题

**解决步骤**:

1. **验证配置**
   ```javascript
   // 在浏览器控制台运行
   import { getWebDAVConfig } from '@/lib/webdav-config';
   console.log(getWebDAVConfig());
   ```

2. **检查缓存目录**
   - 登录 WebDAV 服务器
   - 验证 `/ebooks` 目录存在
   - 检查目录权限

3. **查看日志**
   - 打开浏览器控制台
   - 查找 `[WebDAV]` 日志
   - 检查是否有错误信息

4. **手动测试**
   ```javascript
   // 在浏览器控制台运行
   import * as webdavCache from '@/lib/webdav-cache';
   const result = await webdavCache.testWebDAVConnection();
   console.log('Connection test:', result);
   ```

### 6. LRU 清理问题

**症状**:
- 缓存不清理，磁盘满
- 清理后文件仍存在
- 清理速度慢

**原因**:
- 清理阈值设置不当
- 元数据文件损坏
- 并发操作冲突

**解决步骤**:

1. **调整清理参数**
   ```typescript
   // lib/webdav-cache.ts
   const MAX_CACHE_SIZE = 200 * 1024 * 1024;      // 增加容量
   const CLEANUP_THRESHOLD = 0.9;                  // 调整阈值
   const CLEANUP_RATIO = 0.2;                      // 调整清理比例
   ```

2. **手动清理**
   ```javascript
   // 在浏览器控制台运行
   import * as webdavCache from '@/lib/webdav-cache';
   await webdavCache.clearAllBooks();
   console.log('Cache cleared');
   ```

3. **检查元数据**
   - 登录 WebDAV 服务器
   - 删除损坏的 `.meta` 文件
   - 重新启动应用

### 7. 性能问题

**症状**:
- 打开书籍很慢
- 缓存检查耗时
- UI 冻结

**原因**:
- 网络延迟
- 文件过大
- 缓存列表过多

**解决步骤**:

1. **优化网络**
   - 使用更快的网络
   - 减少网络延迟
   - 考虑使用 CDN

2. **优化文件**
   - 压缩 EPUB 文件
   - 分割大文件
   - 使用流式传输

3. **优化缓存**
   - 减少缓存书籍数量
   - 增加清理频率
   - 使用异步操作

## 调试技巧

### 启用详细日志

```javascript
// 在浏览器控制台运行
localStorage.setItem('DEBUG_WEBDAV', 'true');
// 刷新页面
```

### 检查 WebDAV 连接

```bash
# 使用 curl 测试
curl -v -u admin:admin http://localhost:8080/webdav

# 列出目录
curl -u admin:admin -X PROPFIND http://localhost:8080/webdav/ebooks

# 上传文件
curl -u admin:admin -T test.epub http://localhost:8080/webdav/ebooks/test.epub
```

### 查看浏览器存储

```javascript
// 在浏览器控制台运行
// 查看 localStorage
console.log(localStorage);

// 查看 IndexedDB
const dbs = await indexedDB.databases();
console.log(dbs);
```

### 监控网络请求

1. 打开开发者工具 (F12)
2. 切换到 Network 标签
3. 过滤 WebDAV 请求
4. 查看请求/响应详情

## 获取帮助

### 收集诊断信息

```javascript
// 在浏览器控制台运行
import { getWebDAVConfig } from '@/lib/webdav-config';
import * as webdavCache from '@/lib/webdav-cache';

const config = getWebDAVConfig();
const stats = await webdavCache.getCacheStats();
const usage = await webdavCache.getCacheUsagePercent();

console.log('=== WebDAV 诊断信息 ===');
console.log('配置:', config);
console.log('缓存统计:', stats);
console.log('使用率:', usage + '%');
console.log('浏览器:', navigator.userAgent);
console.log('时间:', new Date().toISOString());
```

### 常用命令

```bash
# 重启 WebDAV 服务
docker restart webdav

# 查看 WebDAV 日志
docker logs webdav

# 清理 WebDAV 缓存
rm -rf /path/to/webdav/ebooks/*

# 检查磁盘使用
du -sh /path/to/webdav/ebooks
```

## 相关文档

- `PAGE_CONFIG_GUIDE.md` - 配置使用指南
- `INSTALLATION.md` - 服务器部署指南
- `IMPLEMENTATION_STATUS_V2.md` - 实现状态
