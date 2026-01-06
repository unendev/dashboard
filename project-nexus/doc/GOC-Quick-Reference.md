# GOC AI 系统快速参考

## 1. GOC 是什么？
**Game Operations Center** - 游戏运营中心，一个实时多人AI协作系统

## 2. Room.tsx 的作用
初始化 Liveblocks 多人协作框架，设置认证、存储和房间连接

## 3. AI 逻辑核心链路

### 前端 (CommandCenter.tsx)
```
用户输入 → sendMessage() → /api/goc-chat → 流式响应
                                    ↓
                            工具调用处理 (onToolCall)
                                    ↓
                            Liveblocks 变更
                                    ↓
                            实时同步到所有客户端
```

### 后端 (/api/goc-chat/route.ts)
```
接收请求 → 构建系统提示 → DeepSeek API → 流式返回
                              ↓
                        工具定义 (updateNote, addTodo)
```

### Liveblocks 认证 (/api/liveblocks-auth/route.ts)
```
前端请求 → 生成用户ID → 创建会话 → 授予权限 → 返回令牌
```

## 4. 关键文件位置

| 文件 | 用途 |
|------|------|
| `app/room/[roomId]/page.tsx` | 房间页面入口 |
| `app/components/goc/Room.tsx` | Liveblocks 初始化 |
| `app/components/goc/RoomEntry.tsx` | 用户名输入 |
| `app/components/goc/CommandCenter.tsx` | AI 对话界面 |
| `app/components/goc/TacticalBoard.tsx` | 任务和笔记显示 |
| `app/components/goc/Viewport.tsx` | 内容展示区 |
| `app/api/goc-chat/route.ts` | AI 流式对话 API |
| `app/api/liveblocks-auth/route.ts` | Liveblocks 认证 |
| `liveblocks.config.ts` | Liveblocks 类型定义 |

## 5. 数据流向

```
CommandCenter (用户输入)
    ↓
useChat hook (Vercel AI SDK)
    ↓
POST /api/goc-chat
    ↓
DeepSeek API (流式)
    ↓
onToolCall 处理
    ↓
useMutation (Liveblocks)
    ↓
Storage 更新
    ↓
所有客户端实时同步
```

## 6. 工具调用流程

### updateNote
```typescript
// AI 调用
updateNote({ target: "shared", content: "新笔记内容" })

// 前端处理
updateSharedNotes(content)  // 更新 Liveblocks

// 结果
所有玩家看到笔记更新
```

### addTodo
```typescript
// AI 调用
addTodo({ task: "找食物" })

// 前端处理
addTodo(task)  // 添加到 Liveblocks

// 结果
任务出现在 TacticalBoard
```

## 7. AI 模式

| 模式 | 行为 |
|------|------|
| Advisor | 被动提供建议 |
| Interrogator | 主动挖掘信息 |
| Planner | 创建计划并使用工具 |

## 8. 环境变量

```env
DEEPSEEK_API_KEY=sk-...          # AI 模型
LIVEBLOCKS_SECRET_KEY=sk_...     # 实时协作
NEXTAUTH_URL=...                 # 认证
NEXTAUTH_SECRET=...              # 认证密钥
DATABASE_URL=postgresql://...    # 数据库
```

## 9. 存储结构 (Liveblocks)

```typescript
{
  todos: LiveList<{ id, text, completed }>,
  notes: string,                    // 共享笔记
  playerNotes: LiveMap<userId, string>,  // 私人笔记
  messages: LiveList<{ role, content, ... }>,
  streamingResponse: { ... } | null,
  currentUrl: string | null
}
```

## 10. 常见问题

**Q: 如何添加新的 AI 工具？**
A: 在 `/api/goc-chat/route.ts` 的 `tools` 对象中添加，然后在 `CommandCenter.tsx` 的 `onToolCall` 中处理

**Q: 如何改变 AI 行为？**
A: 修改 `/api/goc-chat/route.ts` 中的 `systemPrompt`

**Q: 如何添加新的 AI 模式？**
A: 在 `CommandCenter.tsx` 中添加模式按钮，在后端根据 `mode` 参数调整 `modeInstruction`

**Q: 如何实现私人消息？**
A: 使用 `playerNotes` 而不是 `notes`，或在消息中添加 `visibility` 字段

**Q: 如何持久化数据？**
A: Liveblocks 自动持久化，但可以在 `/api/liveblocks-auth` 中集成数据库保存

