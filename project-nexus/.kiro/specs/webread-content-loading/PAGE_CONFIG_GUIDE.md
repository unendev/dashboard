# WebDAV 页面配置指南

## 概述

WebRead 现在支持在页面中显式指定 WebDAV 配置，无需依赖环境变量。这使得配置更加灵活和用户友好。

## 功能特性

### 1. 配置面板

在 WebRead 书架页面的右下角有一个蓝色的设置按钮（⚙️），点击可以打开配置面板。

### 2. 配置项

配置面板包含以下项目：

| 项目 | 说明 | 示例 |
|------|------|------|
| **WebDAV URL** | WebDAV 服务器地址 | `http://localhost:8080/webdav` |
| **Username** | 用户名 | `admin` |
| **Password** | 密码 | `••••••••` |
| **Ebook Path** | 电子书存储路径 | `/ebooks` |

### 3. 功能按钮

- **Test Connection** - 测试 WebDAV 连接是否正常
- **Save** - 保存配置
- **Close** - 关闭配置面板

## 使用步骤

### 步骤 1：打开配置面板

1. 打开 WebRead 书架页面
2. 点击右下角的蓝色设置按钮（⚙️）

### 步骤 2：输入配置

根据你的 WebDAV 服务器类型，输入相应的配置：

#### Nextcloud

```
WebDAV URL: http://localhost:8080/remote.php/dav/files/admin
Username: admin
Password: your_password
Ebook Path: /ebooks
```

#### Synology NAS

```
WebDAV URL: https://nas.example.com:5006
Username: your_username
Password: your_password
Ebook Path: /ebooks
```

#### 自建服务器

```
WebDAV URL: http://your-server.com:8080
Username: admin
Password: admin
Ebook Path: /ebooks
```

### 步骤 3：测试连接

1. 点击 **Test Connection** 按钮
2. 等待测试完成
3. 如果显示 "✓ 连接成功！"，说明配置正确
4. 如果显示 "✗ 连接失败，请检查配置"，请检查配置是否正确

### 步骤 4：保存配置

1. 点击 **Save** 按钮保存配置
2. 配置会被保存到浏览器的内存中
3. 关闭配置面板

## 配置持久化

### 浏览器内存存储

当前配置存储在浏览器内存中，刷新页面后会重置为默认值。

### 环境变量备份

如果配置面板中没有输入值，系统会使用环境变量中的默认值：

```env
WEBDAV_URL="http://localhost:8080/webdav"
WEBDAV_USERNAME="admin"
WEBDAV_PASSWORD="admin"
WEBDAV_EBOOK_PATH="/ebooks"
```

### 本地存储（可选）

如果需要持久化配置，可以修改 `webdav-config.ts` 来使用 localStorage：

```typescript
// 在 webdav-config.ts 中添加
const savedConfig = localStorage.getItem('webdav-config');
if (savedConfig) {
  currentConfig = JSON.parse(savedConfig);
}

export function setWebDAVConfig(config: Partial<WebDAVConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  localStorage.setItem('webdav-config', JSON.stringify(currentConfig));
}
```

## 故障排除

### 问题 1：连接失败

**症状**：点击 "Test Connection" 后显示 "✗ 连接失败"

**检查清单**：
- [ ] WebDAV URL 是否正确？
- [ ] WebDAV 服务器是否运行？
- [ ] 用户名和密码是否正确？
- [ ] 防火墙是否允许连接？
- [ ] 网络连接是否正常？

**解决步骤**：
1. 检查 WebDAV 服务器是否运行
2. 验证 URL 格式是否正确
3. 确认用户名和密码
4. 检查防火墙设置
5. 尝试从命令行测试连接：
   ```bash
   curl -u admin:admin http://localhost:8080/webdav/
   ```

### 问题 2：上传文件失败

**症状**：上传 EPUB 文件时出错

**可能原因**：
- WebDAV 连接未建立
- 权限不足
- 存储空间不足

**解决步骤**：
1. 先测试 WebDAV 连接
2. 检查用户权限
3. 检查服务器存储空间

### 问题 3：配置丢失

**症状**：刷新页面后配置被重置

**原因**：配置存储在浏览器内存中

**解决**：
- 每次打开页面时重新输入配置
- 或者在 `.env` 中设置默认配置

## 配置示例

### 本地开发环境

```
WebDAV URL: http://localhost:8080/webdav
Username: admin
Password: admin
Ebook Path: /ebooks
```

### 生产环境（Nextcloud）

```
WebDAV URL: https://cloud.example.com/remote.php/dav/files/admin
Username: your_username
Password: your_password
Ebook Path: /ebooks
```

### 生产环境（Synology）

```
WebDAV URL: https://nas.example.com:5006
Username: your_username
Password: your_password
Ebook Path: /ebooks
```

## 高级配置

### 修改默认配置

编辑 `lib/webdav-config.ts` 中的 `DEFAULT_CONFIG`：

```typescript
const DEFAULT_CONFIG: WebDAVConfig = {
  url: 'http://your-server.com:8080/webdav',
  username: 'your_username',
  password: 'your_password',
  ebookPath: '/ebooks',
};
```

### 添加配置预设

可以在配置面板中添加预设配置按钮：

```typescript
const presets = {
  nextcloud: {
    url: 'http://localhost:8080/remote.php/dav/files/admin',
    username: 'admin',
    password: 'admin',
    ebookPath: '/ebooks',
  },
  synology: {
    url: 'https://nas.example.com:5006',
    username: 'admin',
    password: 'admin',
    ebookPath: '/ebooks',
  },
};
```

## 安全建议

1. **不要在代码中硬编码密码**
   - 使用环境变量或配置面板输入

2. **使用 HTTPS**
   - 在生产环境中使用 HTTPS 连接

3. **定期更换密码**
   - 定期更新 WebDAV 服务器密码

4. **限制访问权限**
   - 为 WebDAV 用户设置最小必要权限

5. **监控访问日志**
   - 定期检查 WebDAV 服务器的访问日志

## 调试

### 启用详细日志

打开浏览器开发者工具（F12），查看 Console 标签，会看到详细的日志：

```
[WebDAV Config] Configuration updated: { url: '...', username: '...', ebookPath: '...' }
[WebDAV] Initializing client with config: { url: '...', username: '...', ebookPath: '...' }
[WebDAV] ✓ Client initialized successfully
[WebDAV] Directory exists: /ebooks
```

### 测试连接

在浏览器控制台中运行：

```javascript
import * as webdavCache from '@/lib/webdav-cache';

const result = await webdavCache.testWebDAVConnection();
console.log('Connection test result:', result);
```

## 常见问题

### Q: 配置会被保存吗？

**A**: 配置存储在浏览器内存中，刷新页面后会重置。如果需要持久化，可以修改代码使用 localStorage。

### Q: 可以同时使用多个 WebDAV 服务器吗？

**A**: 当前不支持，但可以通过修改代码来实现。

### Q: 如何重置为默认配置？

**A**: 在配置面板中清空所有字段，然后点击 Save，系统会使用环境变量中的默认值。

### Q: 密码是否安全？

**A**: 密码存储在浏览器内存中，不会被保存到磁盘。但建议在生产环境中使用 HTTPS。

## 下一步

- 阅读 `WEBDAV_MIGRATION.md` 了解完整的迁移指南
- 阅读 `INSTALLATION.md` 了解 WebDAV 服务器部署
- 查看 `STORAGE_COMPARISON.md` 了解 IndexedDB vs WebDAV 对比

---

**更新日期**：2025-12-16
**状态**：✅ 页面配置指南完成

