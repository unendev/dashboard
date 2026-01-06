# AI角色模式工作机制说明

## 概述

项目中的AI角色模式（Advisor、Interrogator、Planner）已经正确实现并通过系统提示词和工具使用策略来影响AI的行为。

## 实现机制

### 1. 前端实现

在 `app/components/goc/GOCCommandCenter.tsx` 中：

- **模式切换UI**：三个按钮允许用户在Advisor、Interrogator、Planner模式间切换
- **状态管理**：`aiMode` 状态跟踪当前选择的模式
- **API请求**：模式信息通过请求体发送到后端

```typescript
const [aiMode, setAiMode] = useState<AIMode>('advisor');

// 在请求中包含模式
const transport = useMemo(() => {
  return new DefaultChatTransport({
    api: apiEndpoint,
    body: {
      mode: aiMode, // 'advisor' | 'interrogator' | 'planner'
      model: aiModel,
      roomId: room.id,
      players,
    },
  });
}, [apiEndpoint, aiMode, aiModel, room.id, players]);
```

### 2. 后端实现

在 `app/api/goc-chat/route.ts` 中：

#### 模式指令生成（148-160行）
```typescript
let modeInstruction = "";
switch (mode) {
  case 'interrogator':
    modeInstruction = `**Current Mode: Interrogator** - Your primary goal is to actively gather intelligence. Ask sharp, specific questions to fill in gaps in the Field Notes.`;
    break;
  case 'planner':
    modeInstruction = `**Current Mode: Planner** - Your primary goal is to create structured plans. Use lists and clear steps. You MUST use tools to update notes and add todos.`;
    break;
  case 'advisor':
  default:
    modeInstruction = `**Current Mode: Tactical Advisor** - Your primary goal is to provide real-time decision support based on the current situation.`;
    break;
}
```

#### 系统提示词集成（162-179行）
```typescript
const systemPrompt = `You are an elite Game Operations Center (GOC) AI Tactical Advisor (Nexus AI).
Your goal is to assist players. You have access to tools to read and update shared "Field Notes" and manage todos.

**Online Players:**
${playerContext}

${modeInstruction}

**General Directives:**
1. You MUST reply in Chinese.
2. Be a calm, professional co-pilot.
3. Adapt to the game type if mentioned in the notes.
4. **Tool Usage Guidelines:**
   - For simple questions or greetings (like "1", "hello", "hi"), respond directly without using tools.
   - Use the \`getNotes\` tool to read Field Notes when you need context about the current situation.
   - Only use \`updateNote\` or \`addTodo\` when the user explicitly requests updates or when creating structured plans that require action items.
   - When in doubt, respond conversationally first, then ask if the user wants to update notes or add todos.
`;
```

#### 工具使用策略（363-367行）
```typescript
// Set tool choice based on mode
// 'auto' (default): model decides when to use tools
// 'required': model must use a tool (useful for planner mode)
// 'none': disable tool usage
const toolChoice = mode === 'planner' ? 'required' : 'auto';
```

## 各模式特点

### 1. Advisor（顾问）模式
- **目标**：提供实时决策支持
- **行为**：
  - 基于当前情况提供建议
  - 被动使用工具（仅在需要时）
  - 专注于战术分析和建议

### 2. Interrogator（审讯者）模式
- **目标**：主动收集情报
- **行为**：
  - 提出尖锐、具体的问题
  - 填补战场笔记中的空白
  - 主动探索信息缺口

### 3. Planner（规划者）模式
- **目标**：创建结构化计划
- **行为**：
  - **强制使用工具**（`toolChoice: 'required'）
  - 必须使用工具更新笔记和添加待办事项
  - 使用列表和清晰步骤
  - 专注于结构化规划

## 工具集成

所有模式都可以访问以下工具：
- `getNotes`：读取共享战场笔记
- `updateNote`：更新笔记（共享或个人）
- `addTodo`：添加待办事项
- `compressContext`：压缩对话历史

## 验证方法

1. **切换模式**：在前端切换不同模式，观察AI响应风格变化
2. **Planner模式验证**：在Planner模式下，AI应该总是使用工具
3. **响应差异**：不同模式应对相同输入产生不同风格的响应

## 总结

AI角色模式已经正确实现并通过以下机制工作：
1. **系统提示词**：为每个模式定义明确的角色和目标
2. **工具使用策略**：特别是Planner模式的强制工具使用
3. **行为指导**：通过具体的指令指导AI在不同模式下的行为

这种设计确保了AI在不同模式下的行为有明显差异，为用户提供了多样化的交互体验。