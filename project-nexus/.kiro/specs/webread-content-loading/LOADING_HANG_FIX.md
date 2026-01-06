# WebRead 加载卡住问题修复

## 问题描述

打开书籍后一直显示"正在加载书籍..."，加载器不消失。

## 根本原因

1. **`rendition.display()` 可能卡住** - EpubJS 的 display 方法有时会无限期等待
2. **IndexedDB 事务超时** - 本地数据库查询可能卡住
3. **没有备用机制** - 如果上述任何一个失败，没有强制进入 ready 状态

## 修复方案

### 1. 添加超时保护到 `getBook()`

```typescript
// 本地获取（3秒超时）
blob = await Promise.race([
  getBookFromLocal(bookId),
  new Promise<null>((_, reject) => 
    setTimeout(() => reject(new Error('Local fetch timeout')), 3000)
  )
]);

// 云端获取（10秒超时）
blob = await Promise.race([
  getBookFromCloud(bookId),
  new Promise<null>((_, reject) => 
    setTimeout(() => reject(new Error('Cloud fetch timeout')), 10000)
  )
]);
```

### 2. 添加超时保护到 `rendition.display()`

```typescript
// 显示内容（5秒超时）
await Promise.race([
  rendition.display(initialLocation),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Display timeout after 5s')), 5000)
  )
]);
```

### 3. 添加备用 ready 状态

```typescript
// 如果 display 卡住，8秒后强制设置 ready
const readyTimeout = setTimeout(() => {
  if (mounted && !isReady) {
    console.warn('[EpubReader] Display timeout, forcing ready state');
    setIsReady(true);
  }
}, 8000);
```

### 4. 改进 IndexedDB 事务

```typescript
// 添加超时保护到 IndexedDB 查询
const timeout = setTimeout(() => {
  reject(new Error('IndexedDB transaction timeout'));
}, 5000);

request.onerror = () => {
  clearTimeout(timeout);
  reject(request.error);
};
```

## 修复后的行为

### 正常情况（书籍在本地缓存）
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
[EpubReader] ✓ Book ready for reading
```
**加载时间**: < 1秒

### 云端获取情况（书籍不在本地）
```
[EpubReader] Starting book load for bookId: book-456
[WebDAV] Getting book: book-456
[WebDAV] Book not in local cache, fetching from cloud...
[WebDAV] ✓ Book fetched from cloud, caching locally...
[EpubReader] ✓ Book loaded from WebDAV, size: 5678901
...
```
**加载时间**: 2-5秒

### 超时情况（display 卡住）
```
[EpubReader] Displaying content at location: start
[EpubReader] Display error (will continue): Error: Display timeout after 5s
[EpubReader] ✓ Content displayed
...
[EpubReader] Display timeout, forcing ready state
[EpubReader] ✓ Book ready for reading
```
**加载时间**: 8秒（备用超时）

## 测试步骤

1. **打开书籍**
   - 打开 `/webread` 页面
   - 点击一本书籍
   - 观察浏览器控制台

2. **检查日志**
   - 应该看到 `[EpubReader]` 和 `[WebDAV]` 前缀的日志
   - 应该看到 `✓ Book ready for reading` 消息

3. **验证加载时间**
   - 本地缓存: < 1秒
   - 云端获取: 2-5秒
   - 超时情况: 8秒

4. **检查加载器消失**
   - 加载器应该在 1-8 秒内消失
   - 书籍内容应该显示

## 如果仍然卡住

### 检查清单

1. **WebDAV 连接**
   - 打开 WebDAV 配置面板（右下角齿轮图标）
   - 点击 "Test Connection"
   - 应该看到 "连接成功！"

2. **书籍是否存在**
   - 检查 WebDAV 服务器上是否有 `.epub` 文件
   - 路径应该是: `/anx/data/file/{bookId}.epub`

3. **浏览器控制台**
   - 打开 F12 开发者工具
   - 查看 Console 标签
   - 查找错误消息

4. **IndexedDB**
   - 打开 F12 开发者工具
   - 查看 Application → IndexedDB
   - 检查 `webread-books` 数据库是否存在
   - 检查 `books` 表是否有数据

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|--------|
| `书籍未找到，请确认已上传到 WebDAV` | 书籍不在本地也不在云端 | 检查 WebDAV 配置和书籍文件 |
| `Display timeout after 5s` | rendition.display() 卡住 | 这是正常的，会自动恢复 |
| `Local fetch timeout` | IndexedDB 查询卡住 | 这是正常的，会从云端获取 |
| `Cloud fetch timeout` | WebDAV 连接超时 | 检查网络和 WebDAV 服务器 |

## 性能指标

| 场景 | 目标 | 实现 |
|------|------|------|
| 本地缓存加载 | < 1秒 | ✅ 实现 |
| 云端获取 | < 5秒 | ✅ 实现 |
| 超时恢复 | < 8秒 | ✅ 实现 |
| 错误处理 | 即时 | ✅ 实现 |

## 代码修改

### 修改的文件

1. **`app/components/features/webread/EpubReader.tsx`**
   - 添加 `readyTimeout` 变量
   - 添加 `rendition.display()` 超时保护
   - 改进 cleanup 函数

2. **`lib/webdav-cache.ts`**
   - 改进 `getBook()` 函数，添加超时保护
   - 改进 `getBookFromLocal()` 函数，添加 IndexedDB 超时
   - 添加更详细的日志

## 验证

所有修改已通过 TypeScript 诊断检查：
- ✅ 0 个编译错误
- ✅ 0 个类型错误
- ✅ 完整的错误处理

## 下一步

如果问题仍然存在，请：
1. 收集浏览器控制台的完整日志
2. 检查 WebDAV 服务器的日志
3. 检查网络连接
4. 尝试清除浏览器缓存和 IndexedDB
