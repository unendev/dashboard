# WebRead 详细日志收集指南

## 已添加的详细日志

我已经在代码中添加了大量的详细日志，用于追踪执行流程。

### EpubReader.tsx 中的日志

```
[EpubReader] ========== START LOAD BOOK ==========
[EpubReader] bookId: xxx
[EpubReader] mounted: true
[EpubReader] viewerRef.current: true
[EpubReader] [STEP 1] Loading from WebDAV...
[EpubReader] [STEP 1] getBook() took: XXX ms
[EpubReader] ✓ Book loaded from WebDAV, size: XXX bytes
[EpubReader] [STEP 2] Converting to ArrayBuffer...
[EpubReader] [STEP 2] ArrayBuffer ready, size: XXX bytes
[EpubReader] [STEP 3] Initializing EpubJS Book...
[EpubReader] [STEP 3] ✓ Book initialized
[EpubReader] [STEP 4] Creating rendition...
[EpubReader] [STEP 4] ✓ Rendition created
[EpubReader] [STEP 5] Setting up ready timeout (8s)...
[EpubReader] [STEP 6] Displaying content at location: start
[EpubReader] [STEP 6] Calling rendition.display()...
[EpubReader] [STEP 6] ✓ rendition.display() completed in XXX ms
[EpubReader] [STEP 7] ✓ Content displayed
[EpubReader] [STEP 8] Applying styles...
[EpubReader] [STEP 9] Setting up event listeners...
[EpubReader] [STEP 10] Setting up bubbles...
[EpubReader] [STEP 10] ✓ Bubbles setup complete
[EpubReader] [STEP 11] Setting isReady state...
[EpubReader] [STEP 11] mounted: true
[EpubReader] [STEP 11] isReady before: false
[EpubReader] [STEP 11] ✓ setIsReady(true) called
[EpubReader] ========== LOAD BOOK COMPLETE ==========
```

### webdav-cache.ts 中的日志

```
[WebDAV] ========== getBook START ==========
[WebDAV] bookId: xxx
[WebDAV] [STEP 1] Trying to get from local cache (3s timeout)...
[WebDAV] [STEP 1] Local fetch completed in XXX ms
[WebDAV] [STEP 1] ✓ Book found in local cache, size: XXX
[WebDAV] ========== getBook COMPLETE (from local) ==========

或

[WebDAV] [STEP 1] Local fetch failed or timed out after XXX ms: Error: ...
[WebDAV] [STEP 2] Book not in local cache, fetching from cloud (10s timeout)...
[WebDAV] [getBookFromCloud] START - bookId: xxx
[WebDAV] [getBookFromCloud] Config: { url: ..., ebookPath: ... }
[WebDAV] [getBookFromCloud] Client initialized
[WebDAV] [getBookFromCloud] Fetching from path: /anx/data/file/xxx.epub
[WebDAV] [getBookFromCloud] Calling client.getFileContents()...
[WebDAV] [getBookFromCloud] ✓ File content received, size: XXX
[WebDAV] [getBookFromCloud] ✓ Blob created, size: XXX
[WebDAV] [getBookFromCloud] COMPLETE
[WebDAV] [STEP 2] Cloud fetch completed in XXX ms
[WebDAV] [STEP 2] ✓ Book fetched from cloud, size: XXX
[WebDAV] [STEP 3] Caching to local...
[WebDAV] [STEP 3] ✓ Cached to local
[WebDAV] ========== getBook COMPLETE (from cloud) ==========
```

## 如何收集日志

### 步骤 1: 打开浏览器开发者工具

```
按 F12 打开开发者工具
或右键 → 检查 → Console 标签
```

### 步骤 2: 清除旧日志

```
在 Console 中右键 → Clear console
或按 Ctrl+L
```

### 步骤 3: 打开书籍

```
1. 打开 /webread 页面
2. 点击一本书籍
3. 观察 Console 中的日志
```

### 步骤 4: 收集日志

```
右键点击 Console 区域
选择 "Save as..." 或 "Copy all"
粘贴到文本编辑器保存
```

## 日志分析

### 正常情况（本地缓存）

**预期日志**:
```
[EpubReader] ========== START LOAD BOOK ==========
[WebDAV] ========== getBook START ==========
[WebDAV] [STEP 1] Trying to get from local cache (3s timeout)...
[WebDAV] [getBookFromLocal] START
[WebDAV] [getBookFromLocal] Transaction started
[WebDAV] [getBookFromLocal] Request success
[WebDAV] [getBookFromLocal] ✓ Book found, size: XXX
[WebDAV] [getBookFromLocal] COMPLETE
[WebDAV] [STEP 1] Local fetch completed in XXX ms
[WebDAV] [STEP 1] ✓ Book found in local cache
[WebDAV] ========== getBook COMPLETE (from local) ==========
[EpubReader] [STEP 1] getBook() took: XXX ms
[EpubReader] ✓ Book loaded from WebDAV, size: XXX bytes
[EpubReader] [STEP 2] Converting to ArrayBuffer...
[EpubReader] [STEP 2] ArrayBuffer ready, size: XXX bytes
[EpubReader] [STEP 3] Initializing EpubJS Book...
[EpubReader] [STEP 3] ✓ Book initialized
[EpubReader] [STEP 4] Creating rendition...
[EpubReader] [STEP 4] ✓ Rendition created
[EpubReader] [STEP 5] Setting up ready timeout (8s)...
[EpubReader] [STEP 6] Displaying content at location: start
[EpubReader] [STEP 6] Calling rendition.display()...
[EpubReader] [STEP 6] ✓ rendition.display() completed in XXX ms
[EpubReader] [STEP 7] ✓ Content displayed
[EpubReader] [STEP 8] Applying styles...
[EpubReader] [STEP 9] Setting up event listeners...
[EpubReader] [STEP 10] Setting up bubbles...
[EpubReader] [STEP 10] ✓ Bubbles setup complete
[EpubReader] [STEP 11] Setting isReady state...
[EpubReader] [STEP 11] ✓ setIsReady(true) called
[EpubReader] ========== LOAD BOOK COMPLETE ==========
```

**加载时间**: < 1秒

### 云端获取情况

**预期日志**:
```
[WebDAV] [STEP 1] Local fetch failed or timed out after XXX ms: Error: ...
[WebDAV] [STEP 2] Book not in local cache, fetching from cloud (10s timeout)...
[WebDAV] [getBookFromCloud] START
[WebDAV] [getBookFromCloud] Config: { url: ..., ebookPath: ... }
[WebDAV] [getBookFromCloud] Client initialized
[WebDAV] [getBookFromCloud] Fetching from path: /anx/data/file/xxx.epub
[WebDAV] [getBookFromCloud] Calling client.getFileContents()...
[WebDAV] [getBookFromCloud] ✓ File content received, size: XXX
[WebDAV] [getBookFromCloud] ✓ Blob created, size: XXX
[WebDAV] [getBookFromCloud] COMPLETE
[WebDAV] [STEP 2] Cloud fetch completed in XXX ms
[WebDAV] [STEP 2] ✓ Book fetched from cloud, size: XXX
[WebDAV] [STEP 3] Caching to local...
[WebDAV] [STEP 3] ✓ Cached to local
[WebDAV] ========== getBook COMPLETE (from cloud) ==========
...
[EpubReader] ========== LOAD BOOK COMPLETE ==========
```

**加载时间**: 2-5秒

### 超时恢复情况

**预期日志**:
```
[EpubReader] [STEP 6] Calling rendition.display()...
[EpubReader] [STEP 6] Display error after XXX ms: Error: Display timeout after 5s
[EpubReader] [STEP 6] Clearing ready timeout...
[EpubReader] [STEP 7] ✓ Content displayed
...
[EpubReader] [TIMEOUT] Display timeout, forcing ready state
[EpubReader] ========== LOAD BOOK COMPLETE ==========
```

**加载时间**: 8秒

## 常见问题

### 问题 1: 日志在 STEP 1 停止

**症状**:
```
[EpubReader] [STEP 1] Loading from WebDAV...
[EpubReader] [STEP 1] getBook() took: XXX ms
// 然后没有后续日志
```

**原因**: getBook() 返回 null 或出错

**解决方案**:
- 检查 WebDAV 配置
- 检查书籍文件是否存在
- 查看 WebDAV 日志

### 问题 2: 日志在 STEP 6 停止

**症状**:
```
[EpubReader] [STEP 6] Calling rendition.display()...
// 然后没有后续日志
```

**原因**: rendition.display() 卡住

**解决方案**:
- 等待 5 秒超时
- 等待 8 秒备用 ready 状态
- 检查浏览器控制台是否有错误

### 问题 3: 日志在 STEP 11 停止

**症状**:
```
[EpubReader] [STEP 11] Setting isReady state...
[EpubReader] [STEP 11] ✓ setIsReady(true) called
// 然后没有 LOAD BOOK COMPLETE
```

**原因**: 可能是 React 状态更新问题

**解决方案**:
- 检查浏览器控制台是否有 React 错误
- 尝试刷新页面

### 问题 4: 日志显示错误

**症状**:
```
[WebDAV] [getBookFromCloud] FAILED: Error: ...
或
[EpubReader] ========== FATAL ERROR ==========
```

**原因**: 具体错误信息会显示

**解决方案**:
- 根据错误信息进行排查
- 检查 WebDAV 连接
- 检查书籍文件

## 日志导出

### 方法 1: 复制所有日志

```
1. 打开 F12 Console
2. 右键点击日志区域
3. 选择 "Copy all"
4. 粘贴到文本编辑器
```

### 方法 2: 保存为文件

```
1. 打开 F12 Console
2. 右键点击日志区域
3. 选择 "Save as..."
4. 选择保存位置和文件名
```

### 方法 3: 使用控制台命令

```javascript
// 在控制台运行以下命令导出日志
copy(document.body.innerText);
// 然后粘贴到文本编辑器
```

## 性能分析

### 从日志中提取性能数据

```
[EpubReader] [STEP 1] getBook() took: XXX ms
[EpubReader] [STEP 6] ✓ rendition.display() completed in XXX ms
[WebDAV] [STEP 1] Local fetch completed in XXX ms
[WebDAV] [STEP 2] Cloud fetch completed in XXX ms
```

### 计算总加载时间

```
总时间 = getBook() 时间 + 初始化时间 + display() 时间
```

### 性能目标

| 阶段 | 目标 | 实际 |
|------|------|------|
| getBook() | < 1秒 (本地) 或 < 5秒 (云端) | ? |
| 初始化 | < 1秒 | ? |
| display() | < 5秒 | ? |
| 总计 | < 8秒 | ? |

## 下一步

1. **打开书籍并收集日志**
   - 按照上述步骤收集完整的日志

2. **分析日志**
   - 找出日志停止的位置
   - 查看是否有错误消息

3. **根据日志进行排查**
   - 如果在 STEP 1 停止 → 检查 WebDAV
   - 如果在 STEP 6 停止 → 等待超时或检查浏览器
   - 如果有错误 → 根据错误信息排查

4. **提供日志给开发团队**
   - 完整的浏览器日志
   - 浏览器类型和版本
   - WebDAV 配置信息

---

**日志收集完成后，请将日志内容分享给开发团队进行分析。**
