# WebDAV 同步快速开始

## 5 分钟快速设置

### 1. 配置 WebDAV

编辑 `.env` 文件：

```env
WEBDAV_URL="http://your-webdav-server:port/path"
WEBDAV_USERNAME="your-username"
WEBDAV_PASSWORD="your-password"
WEBDAV_EBOOK_PATH="/anx/data/file"
```

### 2. 测试连接

1. 打开应用
2. 进入 `/webread` 页面
3. 点击右下角 ⚙️ 按钮
4. 点击 "Test Connection"
5. 看到 "连接成功！" 即可

### 3. 同步书籍

**自动同步：**
- 进入 `/webread` 页面时自动同步

**手动同步：**
1. 点击右下角 ⚙️ 按钮
2. 点击 "Sync Books"
3. 等待同步完成

### 4. 上传新书

1. 点击 "导入 EPUB" 按钮
2. 选择 EPUB 文件
3. 等待上传完成
4. 书籍自动出现在书架

### 5. 阅读书籍

1. 点击书籍
2. 等待加载
3. 开始阅读

## 常见 WebDAV 服务器配置

### Nextcloud

```env
WEBDAV_URL="https://your-nextcloud.com/remote.php/dav/files/admin"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="your-password"
WEBDAV_EBOOK_PATH="/ebooks"
```

### Synology NAS

```env
WEBDAV_URL="https://your-nas.com:5006"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="your-password"
WEBDAV_EBOOK_PATH="/ebooks"
```

### 自建 WebDAV

```env
WEBDAV_URL="http://your-server.com:8080/webdav"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="admin"
WEBDAV_EBOOK_PATH="/ebooks"
```

## 故障排除

### 连接失败

1. 检查 WebDAV 服务器是否在线
2. 验证 URL、用户名、密码
3. 检查防火墙设置
4. 查看浏览器控制台错误

### 同步显示 0 本书籍

1. 检查 `WEBDAV_EBOOK_PATH` 是否正确
2. 确认目录中有 .epub 文件
3. 检查用户权限

### 书籍无法加载

1. 检查文件是否存在于 WebDAV
2. 尝试用其他 EPUB 阅读器打开
3. 清空本地存储后重试

## 浏览器控制台命令

### 查看同步日志

```javascript
// 在浏览器控制台执行
import * as webdavCache from '@/lib/webdav-cache';
const result = await webdavCache.syncBooksFromCloud();
console.log('同步结果:', result);
```

### 查看本地书籍

```javascript
import * as webdavCache from '@/lib/webdav-cache';
const books = await webdavCache.getAllLocalBooks();
console.log('本地书籍:', books);
```

### 清空本地存储

```javascript
import * as webdavCache from '@/lib/webdav-cache';
await webdavCache.clearAllLocalBooks();
console.log('本地存储已清空');
```

### 获取存储统计

```javascript
import * as webdavCache from '@/lib/webdav-cache';
const stats = await webdavCache.getLocalStorageStats();
console.log('存储统计:', stats);
```

## 工作流程

```
┌─────────────────────────────────────────────────────┐
│ 进入 /webread 页面                                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 自动同步云端书籍到本地                               │
│ (syncBooksFromCloud)                                │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   ✅ 同步完成      ❌ 同步失败
        │                 │
        ▼                 ▼
   显示书架          显示错误提示
        │                 │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   点击书籍          点击导入
        │                 │
        ▼                 ▼
   从本地加载        上传到 WebDAV
   (如果无则          + 本地保存
    从云端下载)
        │                 │
        ▼                 ▼
   开始阅读          书籍出现在书架
```

## 性能提示

1. **首次加载慢？**
   - 这是正常的，因为要从云端下载
   - 后续加载会很快（从本地 IndexedDB）

2. **同步很慢？**
   - 检查网络速度
   - 减少同时下载的书籍数量
   - 考虑在 WebDAV 服务器上启用压缩

3. **本地存储满了？**
   - 打开配置面板
   - 点击 "Clear Local Storage"
   - 重新同步需要的书籍

## 最佳实践

1. ✅ 定期同步（每次进入书架时自动进行）
2. ✅ 备份重要书籍（确保 WebDAV 有备份）
3. ✅ 监控存储空间（定期检查使用情况）
4. ✅ 测试连接（配置后立即测试）
5. ✅ 渐进式加载（大量书籍时分批同步）

## 下一步

- 查看 `SYNC_GUIDE.md` 了解详细信息
- 查看 `SYNC_TESTING.md` 了解测试方法
- 查看 `FINAL_REFACTOR_SUMMARY.md` 了解完整改动

## 需要帮助？

1. 检查浏览器控制台的错误信息
2. 查看 `SYNC_GUIDE.md` 的故障排除部分
3. 测试 WebDAV 连接
4. 查看 WebDAV 服务器日志

---

**祝你使用愉快！** 📚
