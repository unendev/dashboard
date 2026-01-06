# WebDAV 同步功能测试清单

## 前置条件

- [ ] WebDAV 服务器已启动并运行
- [ ] `/anx/data/file/` 目录中有至少一个 `.epub` 文件
- [ ] `.env` 中的 WebDAV 配置正确
- [ ] 浏览器支持 IndexedDB（现代浏览器都支持）

## 测试场景

### 1. 自动同步测试

**步骤：**
1. 打开浏览器开发者工具（F12）
2. 进入 `/webread` 页面
3. 观察控制台输出

**预期结果：**
```
[WebDAV] Initializing client with config: ...
[WebDAV] Starting cloud sync...
[WebDAV] Found X books in cloud
[WebDAV] Need to sync Y books
[WebDAV] ✓ Synced: {bookId}
[WebDAV] Sync complete: { synced: Y, failed: 0, total: X }
```

**验证：**
- [ ] 控制台显示同步日志
- [ ] 同步完成后书籍列表显示
- [ ] 没有错误信息

### 2. 手动同步测试

**步骤：**
1. 点击右下角的 ⚙️ 设置按钮
2. 输入 WebDAV 配置（如果还没有）
3. 点击 "Test Connection" 按钮
4. 等待测试完成
5. 点击 "Sync Books" 按钮
6. 观察同步结果

**预期结果：**
- [ ] "Test Connection" 显示 "连接成功！"（绿色）
- [ ] "Sync Books" 显示同步进度
- [ ] 同步完成后显示 "同步完成：X 本已同步，0 本失败，共 Y 本"

### 3. 本地缓存测试

**步骤：**
1. 打开浏览器开发者工具
2. 进入 Application → IndexedDB → webread-books → books
3. 观察存储的书籍

**预期结果：**
- [ ] 能看到多个书籍记录
- [ ] 每条记录包含 bookId、blob、title、syncedAt、lastAccessAt

### 4. 书籍阅读测试

**步骤：**
1. 从书架点击一本书籍
2. 等待加载完成
3. 观察控制台

**预期结果：**
```
[EpubReader] Starting book load for bookId: {id}
[EpubReader] Loading from WebDAV...
[EpubReader] ✓ Book loaded from WebDAV, size: XXXXX
[EpubReader] ✓ Book initialized
[EpubReader] ✓ Rendition created
[EpubReader] ✓ Content displayed
[EpubReader] ✓ Book ready for reading
```

- [ ] 书籍正常显示
- [ ] 可以翻页
- [ ] 没有错误

### 5. 离线阅读测试

**步骤：**
1. 打开一本书籍（确保已缓存到本地）
2. 断开网络连接（或关闭 WebDAV 服务器）
3. 刷新页面
4. 尝试阅读书籍

**预期结果：**
- [ ] 书籍仍然可以加载
- [ ] 可以正常翻页
- [ ] 没有网络错误

### 6. 上传新书测试

**步骤：**
1. 在书架页面点击 "导入 EPUB" 按钮
2. 选择一个 EPUB 文件
3. 等待上传完成
4. 观察控制台和 WebDAV 服务器

**预期结果：**
```
[WebReadShelf] ✓ Book uploaded to WebDAV
```

- [ ] 书籍出现在书架列表中
- [ ] 文件出现在 WebDAV `/anx/data/file/` 目录中
- [ ] 文件名为 `{bookId}.epub` 格式

### 7. 删除书籍测试

**步骤：**
1. 在书架页面悬停一本书籍
2. 点击删除按钮（垃圾桶图标）
3. 确认删除
4. 观察 WebDAV 服务器

**预期结果：**
- [ ] 书籍从列表中消失
- [ ] 文件从 WebDAV 中删除
- [ ] 本地 IndexedDB 中的记录被删除

### 8. 多设备同步测试

**步骤：**
1. 在设备 A 上上传一本书籍
2. 在设备 B 上进入 `/webread` 页面
3. 观察是否自动同步

**预期结果：**
- [ ] 设备 B 自动同步设备 A 上传的书籍
- [ ] 两台设备的书架列表一致

### 9. 错误处理测试

**步骤：**
1. 关闭 WebDAV 服务器
2. 尝试同步或上传
3. 观察错误提示

**预期结果：**
- [ ] 显示友好的错误信息
- [ ] 不会导致应用崩溃
- [ ] 可以重试操作

### 10. 性能测试

**步骤：**
1. 在 WebDAV 中放置 50+ 个 EPUB 文件
2. 进入 `/webread` 页面
3. 测量同步时间
4. 打开一本已缓存的书籍，测量加载时间

**预期结果：**
- [ ] 同步时间 < 30 秒（取决于网络速度）
- [ ] 已缓存书籍加载时间 < 2 秒
- [ ] UI 不会卡顿

## 调试技巧

### 查看同步日志

```javascript
// 在浏览器控制台执行
localStorage.setItem('debug', 'webdav:*');
// 然后刷新页面，会看到详细的调试日志
```

### 查看本地存储

```javascript
// 在浏览器控制台执行
const db = await new Promise((resolve, reject) => {
  const req = indexedDB.open('webread-books', 1);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const tx = db.transaction(['books'], 'readonly');
const store = tx.objectStore('books');
const req = store.getAll();
req.onsuccess = () => console.log('本地书籍:', req.result);
```

### 清空本地存储

```javascript
// 在浏览器控制台执行
import * as webdavCache from '@/lib/webdav-cache';
await webdavCache.clearAllLocalBooks();
console.log('本地存储已清空');
```

### 手动触发同步

```javascript
// 在浏览器控制台执行
import * as webdavCache from '@/lib/webdav-cache';
const result = await webdavCache.syncBooksFromCloud();
console.log('同步结果:', result);
```

## 常见问题排查

### 同步显示 0 本书籍

**可能原因：**
- WebDAV 路径不正确
- 目录中没有 .epub 文件
- 权限不足

**排查步骤：**
1. 检查 `.env` 中的 `WEBDAV_EBOOK_PATH`
2. 确认 WebDAV 服务器中该目录存在
3. 确认目录中有 .epub 文件
4. 检查用户权限

### 同步失败

**可能原因：**
- 网络连接问题
- WebDAV 服务器离线
- 认证失败

**排查步骤：**
1. 点击 "Test Connection" 测试连接
2. 检查浏览器控制台的错误信息
3. 检查 WebDAV 服务器日志
4. 验证用户名和密码

### 书籍无法加载

**可能原因：**
- 本地和云端都没有文件
- 文件损坏
- 浏览器 IndexedDB 满了

**排查步骤：**
1. 检查 WebDAV 中是否有该文件
2. 尝试用其他 EPUB 阅读器打开文件
3. 清空本地存储后重试

## 测试报告模板

```markdown
# WebDAV 同步功能测试报告

**测试日期：** YYYY-MM-DD
**测试人员：** [Name]
**环境：** [Browser/OS]

## 测试结果

| 测试场景 | 状态 | 备注 |
|---------|------|------|
| 自动同步 | ✅/❌ | |
| 手动同步 | ✅/❌ | |
| 本地缓存 | ✅/❌ | |
| 书籍阅读 | ✅/❌ | |
| 离线阅读 | ✅/❌ | |
| 上传新书 | ✅/❌ | |
| 删除书籍 | ✅/❌ | |
| 多设备同步 | ✅/❌ | |
| 错误处理 | ✅/❌ | |
| 性能测试 | ✅/❌ | |

## 问题记录

### 问题 1
- **描述：** 
- **重现步骤：**
- **预期结果：**
- **实际结果：**
- **严重程度：** 高/中/低

## 总体评价

[总体测试结果和建议]
```

## 完成检查

- [ ] 所有测试场景都已执行
- [ ] 没有发现严重问题
- [ ] 性能满足要求
- [ ] 错误处理完善
- [ ] 文档完整
- [ ] 可以发布到生产环境
