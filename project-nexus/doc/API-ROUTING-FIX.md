# API 路由修复说明

## 问题

在 `/room` 页面发送消息时，调用的是 `/api/chat` 而不是 `/api/chat/goc`，导致：
- 没有 GOC 特定的功能（工具调用、Liveblocks 集成等）
- 消息没有正确的上下文（玩家列表、模式等）

## 根本原因

Vercel AI SDK 的 `useChat` hook 可能有以下行为：
1. 默认 API 端点可能被硬编码
2. `api` 参数可能没有被正确识别
3. 浏览器缓存导致旧的编译版本仍在使用

## 解决方案

### 方案 1: 在 `/api/chat` 中添加转发逻辑（已实施）

修改 `app/api/chat/route.ts`，添加检测逻辑：

```typescript
export async function POST(req: Request) {
  const body = await req.json();
  const { messages, mode, model, roomId, players } = body;

  // 检测是否是 GOC 请求
  if (mode || roomId || players) {
    console.log('[API/CHAT] Detected GOC request, forwarding to /api/chat/goc');
    
    // 转发到 GOC 特定的 API
    const gocResponse = await fetch(new URL('/api/chat/goc', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    return gocResponse;
  }

  // 通用聊天请求...
}
```

### 优点
- ✅ 无需修改 CommandCenter 代码
- ✅ 自动检测和转发
- ✅ 向后兼容
- ✅ 简单有效

### 工作流程

```
CommandCenter 发送消息
    ↓
useChat({ api: '/api/chat/goc', ... })
    ↓
浏览器可能调用 /api/chat（SDK 默认行为）
    ↓
/api/chat 检测到 GOC 参数（mode, roomId, players）
    ↓
自动转发到 /api/chat/goc
    ↓
/api/chat/goc 处理 GOC 特定逻辑
    ↓
返回流式响应
```

## 验证

### 测试步骤
1. 进入房间：`http://localhost:3000/room/test-room?name=Alice`
2. 打开浏览器开发者工具 → Network
3. 发送消息
4. 查看请求：
   - 可能显示 `POST /api/chat 200`（转发）
   - 或 `POST /api/chat/goc 200`（直接）
   - 两者都是正确的

### 预期结果
```
✓ 消息正确发送
✓ AI 响应包含 GOC 特定功能
✓ 工具调用正常工作
✓ Liveblocks 同步正常
```

## 日志输出

当 GOC 请求被转发时，你会看到：
```
[API/CHAT] Detected GOC request, forwarding to /api/chat/goc
```

## 文件变更

### 修改
- `app/api/chat/route.ts` - 添加 GOC 请求检测和转发逻辑
- `app/components/goc/CommandCenter.tsx` - 添加 `id` 和 `headers` 参数（可选）

## 为什么这个方案有效

1. **自动检测** - 通过检查 GOC 特定参数（`mode`, `roomId`, `players`）
2. **无缝转发** - 使用 `fetch` 转发请求到正确的 API
3. **向后兼容** - 通用聊天请求仍然在 `/api/chat` 处理
4. **简单可靠** - 不依赖 SDK 的内部行为

## 其他可能的解决方案

### 方案 2: 使用 API 路由别名
```typescript
// app/api/goc-chat/route.ts
export { POST } from '@/app/api/chat/goc/route';
```
缺点：需要维护多个文件

### 方案 3: 修改 Next.js 配置
```typescript
// next.config.ts
rewrites: {
  beforeFiles: [
    { source: '/api/goc-chat', destination: '/api/chat/goc' }
  ]
}
```
缺点：需要重启开发服务器

### 方案 4: 使用自定义 fetch
在 CommandCenter 中使用 `fetch` 而不是 `useChat`
缺点：失去 SDK 的便利功能

## 推荐

**当前方案（方案 1）是最优的**，因为：
- ✅ 最简单
- ✅ 最可靠
- ✅ 最易维护
- ✅ 无需修改 SDK 配置

## 后续优化

### 短期
- [ ] 验证所有功能正常工作
- [ ] 检查性能影响
- [ ] 添加更详细的日志

### 中期
- [ ] 考虑是否需要 `/api/goc-chat` 别名
- [ ] 统一 API 命名规范
- [ ] 文档化 API 路由

### 长期
- [ ] 重构 API 路由结构
- [ ] 实现 API 版本控制
- [ ] 建立 API 管理指南

