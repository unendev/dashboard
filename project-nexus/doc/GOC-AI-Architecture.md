# GOC AI 系统架构完整指南

## 1. GOC 是什么意思？

**GOC = Game Operations Center（游戏运营中心）**

这是一个实时多人协作系统，用于游戏中的团队协作和AI辅助决策。系统包含：
- **Tactical Board（战术板）**：显示任务列表和共享笔记
- **Command Center（指挥中心）**：AI对话和决策支持
- **Viewport（视口）**：内容展示区域

---

## 2. Room.tsx 是干什么的？

**Room.tsx** 是 GOC 系统的核心容器组件，负责：

### 主要职责：
1. **Liveblocks 多人协作初始化**
   - 设置 `LiveblocksProvider` 和 `RoomProvider`
   - 连接到特定的房间（roomId）

2. **认证处理**
   - 调用 `/api/liveblocks-auth` 获取认证令牌
   - 传递用户名和房间ID

3. **共享存储初始化**
   - `todos`: 任务列表（LiveList）
   - `notes`: 共享笔记（字符串）
   - `playerNotes`: 玩家私人笔记（LiveMap）
   - `messages`: 聊天消息（LiveList）
   - `streamingResponse`: 流式AI响应
   - `currentUrl`: 当前URL

4. **Suspense 边界**
   - 使用 `ClientSideSuspense` 处理加载状态

### 代码流程：
```
RoomEntry (用户输入名字)
    ↓
Room (初始化Liveblocks)
    ↓
RoomProvider (连接到房间)
    ↓
children (CommandCenter, TacticalBoard, Viewport)
```

---

## 3. AI 逻辑完整实现链路

### 3.1 前端流程（CommandCenter.tsx）

#### 初始化
```typescript
const { messages, sendMessage, status } = useChat({
  api: '/api/goc-chat',  // 后端API端点
  async onToolCall({ toolCall }) {
    // 处理AI工具调用
    if (toolCall.toolName === 'updateNote') {
      updateSharedNotes(content);  // 更新Liveblocks存储
    }
    if (toolCall.toolName === 'addTodo') {
      addTodo(task);  // 添加任务到Liveblocks
    }
  },
});
```

#### 用户提交消息
```typescript
const onSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // 构建玩家列表
  const playerList = [
    { id: me?.id, name: me?.info?.name },
    ...others.map(u => ({ id: u.id, name: u.info?.name }))
  ];

  // 发送消息到后端
  sendMessage({ 
    role: 'user', 
    text: localInput 
  }, {
    body: {
      notes,           // 当前共享笔记
      players: playerList,  // 在线玩家列表
      mode: aiMode     // AI模式：advisor/interrogator/planner
    }
  });
};
```

#### 消息显示
```typescript
// 使用 Vercel AI SDK 的 useChat hook
// messages 包含：
// - role: 'user' | 'assistant' | 'system'
// - content: 消息内容
// - toolInvocations: 工具调用记录
// - parts: UI消息的部分内容

messages.map((m: any) => {
  // 显示工具调用状态
  m.toolInvocations?.map((toolInvocation: any) => (
    <div>{toolInvocation.toolName}: {toolInvocation.state}</div>
  ))
  
  // 显示消息内容
  <MarkdownView content={getUIMessageContent(m)} />
})
```

### 3.2 后端流程（/api/goc-chat/route.ts）

#### 请求处理
```typescript
export async function POST(req: Request) {
  const { messages, notes, players, mode } = await req.json();
  
  // 构建玩家上下文
  const playerContext = players
    .map((p: any) => `- ${p.name} (ID: ${p.id})`)
    .join('\n');
  
  // 根据模式选择系统提示
  let modeInstruction = "";
  switch (mode) {
    case 'interrogator':
      modeInstruction = "主动挖掘情报，检查缺失信息，质询玩家";
      break;
    case 'planner':
      modeInstruction = "创建结构化计划，使用Markdown列表，主动使用工具";
      break;
    case 'advisor':
    default:
      modeInstruction = "提供实时决策支持";
      break;
  }
}
```

#### 系统提示词
```typescript
const systemPrompt = `你是精英游戏运营中心(GOC)AI战术顾问(Nexus AI)。
你的目标是协助玩家进行各种游戏。

当前字段笔记(共享):
"""
${notes || '(还没有笔记)'}
"""

在线玩家:
${playerContext}

${modeInstruction}

**指示:**
1. 必须用中文回应
2. 作为专业副指挥官：冷静、高效
3. **行动能力(工具使用):**
   - 你有 updateNote 和 addTodo 工具
   - 当需要记录信息时，必须使用工具执行操作
   - 使用 updateNote 重写共享笔记
   - 使用 addTodo 添加可操作任务
4. 保持回应简洁，使用Markdown
`;
```

#### 流式响应
```typescript
const result = streamText({
  model: deepseek('deepseek-chat'),  // 使用DeepSeek模型
  system: systemPrompt,
  messages,
  temperature: 0.7,
  tools: {
    updateNote: tool({
      description: '更新/重写共享字段笔记或玩家私人笔记',
      parameters: z.object({
        target: z.string(),  // "shared" 或 userId
        content: z.string(), // 新的完整内容
      }),
    }),
    addTodo: tool({
      description: '向共享待办事项列表添加新任务',
      parameters: z.object({
        task: z.string(),
      }),
    }),
  },
});

// 返回流式响应
const stream = 'toDataStream' in result ? result.toDataStream() : result.stream;
return new Response(stream, {
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Vercel-AI-Data-Stream': 'v1',
  }
});
```

### 3.3 工具调用流程

#### 前端处理工具调用
```typescript
async onToolCall({ toolCall }) {
  if (toolCall.toolName === 'updateNote') {
    const { target, content } = toolCall.args;
    
    if (target === 'shared') {
      // 更新共享笔记到Liveblocks
      updateSharedNotes(content);
      return `Shared notes updated.`;
    } else {
      // 更新特定玩家的私人笔记
      updatePlayerNote({ userId: target, newNotes: content });
      return `Notes for ${target} updated.`;
    }
  }
  
  if (toolCall.toolName === 'addTodo') {
    const { task } = toolCall.args;
    addTodo(task);  // 添加到Liveblocks的todos列表
    return `Todo added: ${task}`;
  }
}
```

#### Liveblocks 变更
```typescript
// 更新共享笔记
const updateSharedNotes = useMutation(({ storage }, newNotes: string) => {
  storage.set("notes", newNotes);
}, []);

// 更新玩家笔记
const updatePlayerNote = useMutation(
  ({ storage }, { userId, newNotes }: { userId: string, newNotes: string }) => {
    const pNotes = storage.get("playerNotes");
    if (pNotes) {
      pNotes.set(userId, newNotes);
    }
  }, 
  []
);

// 添加待办事项
const addTodo = useMutation(({ storage }, task: string) => {
  const todos = storage.get("todos");
  if (todos) {
    todos.push({ id: crypto.randomUUID(), text: task, completed: false });
  } else {
    storage.set("todos", new LiveList([
      { id: crypto.randomUUID(), text: task, completed: false }
    ]));
  }
}, []);
```

### 3.4 Liveblocks 认证流程

#### 前端认证请求
```typescript
// Room.tsx 中
<LiveblocksProvider
  authEndpoint={async (room) => {
    const response = await fetch("/api/liveblocks-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, name: userName }),
    });
    return await response.json();
  }}
>
```

#### 后端认证处理
```typescript
// /api/liveblocks-auth/route.ts
export async function POST(request: Request) {
  const { room, name } = await request.json();
  
  // 生成用户ID和信息
  const randomId = Math.floor(Math.random() * 10000);
  const user = {
    id: `user-${randomId}`,
    info: {
      name: name || `Player ${randomId}`,
      color: "#" + Math.floor(Math.random()*16777215).toString(16),
      picture: `https://liveblocks.io/avatars/avatar-${Math.floor(Math.random() * 30)}.png`,
    }
  };

  // 创建会话
  const session = liveblocks.prepareSession(user.id, {
    userInfo: { ...user.info, avatar: "..." }
  });

  // 授予房间访问权限
  session.allow(room, session.FULL_ACCESS);

  // 返回授权结果
  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
```

---

## 4. 完整数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (CommandCenter)                      │
├─────────────────────────────────────────────────────────────┤
│ 1. 用户输入消息                                              │
│ 2. sendMessage() 调用                                        │
│    ↓                                                         │
│ 3. 发送到 /api/goc-chat                                      │
│    - messages: 对话历史                                      │
│    - notes: 当前共享笔记                                     │
│    - players: 在线玩家列表                                   │
│    - mode: AI模式                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  后端 (/api/goc-chat)                        │
├─────────────────────────────────────────────────────────────┤
│ 1. 接收请求                                                  │
│ 2. 构建系统提示词                                            │
│ 3. 调用 DeepSeek API                                         │
│    - 使用 streamText() 流式处理                              │
│    - 定义 updateNote 和 addTodo 工具                         │
│ 4. 返回流式响应                                              │
│    - 文本块                                                  │
│    - 工具调用                                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  前端处理响应                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. 接收流式数据                                              │
│ 2. 处理工具调用 (onToolCall)                                 │
│    - updateNote → updateSharedNotes()                        │
│    - addTodo → addTodo()                                     │
│ 3. 更新 Liveblocks 存储                                      │
│ 4. 显示消息和工具状态                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Liveblocks 实时同步                             │
├─────────────────────────────────────────────────────────────┤
│ 1. 所有连接的客户端接收更新                                  │
│ 2. TacticalBoard 显示更新的笔记和任务                        │
│ 3. 其他玩家看到实时变化                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 关键技术栈

| 组件 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Next.js 14 (App Router) | 服务端渲染和API路由 |
| 实时协作 | Liveblocks | 多人实时同步 |
| AI SDK | Vercel AI SDK | 流式对话和工具调用 |
| AI 模型 | DeepSeek | 主要AI模型 |
| 备选模型 | Google Generative AI | 备选AI模型 |
| 状态管理 | Liveblocks Storage | 共享状态 |
| UI 组件 | React + Tailwind | 用户界面 |
| 类型安全 | TypeScript + Zod | 类型验证 |

---

## 6. 环境变量配置

```env
# Liveblocks
LIVEBLOCKS_SECRET_KEY=sk_...

# AI 服务
DEEPSEEK_API_KEY=sk-...
GOOGLE_API_KEY=...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# 数据库
DATABASE_URL=postgresql://...
```

---

## 7. AI 模式说明

### Advisor（顾问）
- 提供实时决策支持
- 被动响应玩家查询
- 默认模式

### Interrogator（审问官）
- 主动挖掘情报
- 检查缺失的笔记信息
- 质询玩家获取更多细节

### Planner（规划者）
- 创建结构化计划
- 使用Markdown列表
- 主动使用工具更新笔记和任务

---

## 8. 常见操作流程

### 添加任务
```
用户: "我们需要找食物"
  ↓
AI (Planner模式): 使用 addTodo 工具
  ↓
前端: 调用 addTodo() mutation
  ↓
Liveblocks: 更新 todos 列表
  ↓
TacticalBoard: 显示新任务
```

### 更新笔记
```
用户: "密码是123"
  ↓
AI: 使用 updateNote 工具，target="shared"
  ↓
前端: 调用 updateSharedNotes() mutation
  ↓
Liveblocks: 更新 notes 字段
  ↓
所有客户端: 实时看到更新
```

### 私人笔记
```
AI: 使用 updateNote 工具，target="user-123"
  ↓
前端: 调用 updatePlayerNote() mutation
  ↓
Liveblocks: 更新 playerNotes[user-123]
  ↓
该玩家: 看到私人笔记更新
```

---

## 9. 故障排查

### 问题：AI 不响应
- 检查 `DEEPSEEK_API_KEY` 是否配置
- 检查 `/api/goc-chat` 是否返回 500 错误
- 查看浏览器控制台的网络请求

### 问题：Liveblocks 不同步
- 检查 `LIVEBLOCKS_SECRET_KEY` 是否配置
- 确保所有客户端连接到同一个 `roomId`
- 检查浏览器控制台的 Liveblocks 错误

### 问题：工具调用失败
- 检查 `onToolCall` 是否正确处理
- 确保 mutation 函数正确更新存储
- 查看 Liveblocks 存储结构是否匹配

