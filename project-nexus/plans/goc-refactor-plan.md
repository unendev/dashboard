# GOC (Game Operations Center) 重构方案

## 1. 现状评估
目前 GOC 模块的文件（如 `TacticalBoard.tsx`, `CommandCenter.tsx`, `Viewport.tsx`）逻辑高度耦合，存在以下问题：
- **逻辑重复**：多个组件都在重复处理 Liveblocks 的 Mutation 和 Auth。
- **性能隐患**：由于状态管理过于集中，微小的输入变动可能触发大规模重绘。
- **可维护性差**：AI 流式解析、工具调用、UI 渲染混合在一起，难以进行单元测试。

## 2. 重构目标
- **逻辑与渲染分离**：使用自定义 Hooks 处理数据流。
- **原子化组件**：将大型页面拆分为具有单一职责的小型子组件。
- **状态局部化**：减少不必要的全局重绘。

## 3. 详细步骤

### 3.1 抽象数据逻辑 (Custom Hooks)
- `useGocChat`: 封装 `useChat` 逻辑、消息稳定排序算法、以及 `onToolCall` 的具体执行分支。
- `useGocNotes`: 封装共享笔记与个人笔记的 CRUD 操作。
- `useGocTodos`: 封装 Team/Personal 任务的过滤与同步逻辑。
- `useGocUplink`: 将 Viewport 中的屏幕捕捉与 OSS 上传逻辑分离。

### 3.2 组件拆分清单

#### TacticalBoard (战术板)
- `TodoSection`: 包含任务列表、分组逻辑。
  - `TodoItem`: 纯展示组件。
  - `TodoInput`: 处理输入逻辑。
- `NotesSection`: 处理 MD 预览与 Tab 切换。
  - `MarkdownEditor`: 封装 Click-to-Edit 逻辑。
  - `OutlineSidebar`: 独立的大纲组件。

#### CommandCenter (指挥中心)
- `ChatHeader`: 包含实时人数显示、模型/模式切换。
- `MessageList`: 处理消息流渲染、自动滚动逻辑。
  - `ChatMessage`: 优化过的气泡组件，带 `memo`。
  - `ReasoningBlock`: 逻辑独立的思考过程组件。
- `ChatInput`: 独立的输入框，避免打字导致列表重绘。

#### Viewport (监视视口)
- `LiveStreamView`: 处理视频流。
- `IntelGallery`: 展示已分享的截图。
- `ControlDeck`: 控制按钮组。

### 3.3 后端 API 优化
- 抽离 `GocTools`: 独立的工具逻辑文件。
- 抽离 `GocPrompts`: 针对不同模式（Encyclopedia/Advisor）的 Prompt 模板管理。

## 4. 预期收益
- **响应速度**：输入延迟降低 50% 以上。
- **代码行数**：核心主组件代码量减少 60%。
- **稳定性**：通过 Hooks 层面的隔离，减少由于 Liveblocks 同步引发的 UI 跳动。
