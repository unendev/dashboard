# 设计文档 - Todo-Memo 融合布局

## 概述

本设计文档描述了如何改造 Electron timer 项目中的 Todo 页面，将其转变为一个融合式的两栏布局。上栏保持现有的 Todo 列表功能，下栏集成 Memo 编辑器。两个区域之间有一条可拖动的分割线，允许用户自由调整上下区域的高度比例。

## 架构

### 页面结构

```
TodoMemoFusionPage
├── Header (标题栏)
│   ├── 标题和加载状态
│   └── 关闭按钮
├── Container (主容器)
│   ├── TodoSection (上方区域)
│   │   ├── Todo 列表
│   │   └── 输入框
│   ├── Divider (分割线)
│   │   └── 拖动处理逻辑
│   └── MemoSection (下方区域)
│       ├── Memo 编辑器/预览
│       └── 底部信息栏
```

### 数据流

1. **初始化**: 从 localStorage 加载 Todo 项目、Memo 内容和分割线位置
2. **Todo 操作**: 用户操作 Todo 时，更新 localStorage 并刷新列表
3. **Memo 操作**: 用户编辑 Memo 时，实时保存到 localStorage
4. **分割线调整**: 用户拖动分割线时，计算新的高度比例并保存

## 组件和接口

### TodoMemoFusionPage 组件

主容器组件，管理整个融合布局的状态和逻辑。

**Props**: 无

**State**:
- `todoItems: TodoItem[]` - Todo 项目列表
- `memoContent: string` - Memo 编辑器内容
- `topHeight: number` - 上方区域的高度（像素或百分比）
- `isDragging: boolean` - 是否正在拖动分割线
- `viewMode: 'edit' | 'preview'` - Memo 的编辑/预览模式

**关键方法**:
- `handleDragStart()` - 开始拖动分割线
- `handleDragMove(e)` - 拖动过程中更新高度
- `handleDragEnd()` - 结束拖动并保存位置
- `saveDividerPosition()` - 持久化分割线位置到 localStorage
- `loadDividerPosition()` - 从 localStorage 加载分割线位置

### TodoSection 组件

显示 Todo 列表的上方区域。

**Props**:
- `items: TodoItem[]` - Todo 项目列表
- `onAddItem(text, group)` - 添加新项目的回调
- `onToggleItem(id, completed)` - 切换项目完成状态的回调
- `onDeleteItem(id)` - 删除项目的回调
- `onToggleGroup(group)` - 切换分组展开状态的回调

**特性**:
- 显示所有现有的 Todo 功能（分组、完成状态、删除等）
- 支持添加新项目
- 支持分组管理
- 支持双击打开任务备忘录窗口

### MemoSection 组件

显示 Memo 编辑器的下方区域。

**Props**:
- `content: string` - Memo 内容
- `onChange(content)` - 内容变化时的回调
- `viewMode: 'edit' | 'preview'` - 编辑或预览模式
- `onViewModeChange(mode)` - 切换模式的回调

**特性**:
- 支持编辑和预览两种模式
- 支持 Markdown 渲染
- 支持快捷键操作（Ctrl+D 删除行、Ctrl+↑/↓ 移动行）
- 显示字符计数和模式指示

### Divider 组件

可拖动的分割线组件。

**Props**:
- `onDragStart()` - 拖动开始回调
- `onDragMove(deltaY)` - 拖动移动回调
- `onDragEnd()` - 拖动结束回调

**特性**:
- 显示可拖动的分割线
- 鼠标悬停时改变光标为 `row-resize`
- 支持触摸拖动（可选）

## 数据模型

### TodoItem

```typescript
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  group: string;
  createdAt: string;
}
```

### 存储键

- `todo-items-v1` - Todo 项目列表
- `todo-updated-at` - 最后更新时间
- `widget-todo-expanded-groups` - 展开的分组
- `widget-todo-show-completed` - 是否显示已完成项目
- `manifesto-global-log` - 全局 Memo 内容
- `fusion-layout-divider-position` - 分割线位置（百分比，0-100）

## 正确性属性

A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. 
Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: 分割线位置持久化和恢复
*对于任何* 分割线位置（0-100% 之间），当用户设置该位置后，系统应该将其保存到 localStorage，并在页面重新加载时恢复到相同的位置。
**验证: 需求 1.2, 1.4**

### Property 2: 拖动时总高度不变
*对于任何* 拖动操作，上方区域和下方区域的高度总和应该始终等于容器的总高度，不会因为拖动而改变。
**验证: 需求 2.2**

### Property 3: 拖动模式状态转换
*对于任何* 鼠标事件序列（按下、移动、释放），系统应该正确地进入和退出拖动模式，并在释放时保存新的分割线位置。
**验证: 需求 2.1, 2.3**

### Property 4: 最小高度限制
*对于任何* 拖动操作，无论用户如何拖动分割线，上方区域和下方区域的高度都不应该低于最小高度限制（如 100px）。
**验证: 需求 2.4**

### Property 5: Todo 功能完整性
*对于任何* Todo 操作（添加、删除、完成、分组），在融合布局中执行这些操作应该产生与原始 Todo 页面相同的结果。
**验证: 需求 3.1**

### Property 6: Memo 功能完整性
*对于任何* Memo 操作（编辑、保存、预览、Markdown 渲染），在融合布局中执行这些操作应该产生与原始 Memo 页面相同的结果。
**验证: 需求 3.2**

### Property 7: 区域独立性
*对于任何* 在 Todo 区域中的操作，Memo 区域的内容和状态应该保持不变；反之亦然。
**验证: 需求 3.3, 5.4**

### Property 8: 窗口大小变化时分割线比例保持
*对于任何* 窗口高度变化，分割线位置的百分比比例应该保持不变，即使像素高度会改变。
**验证: 需求 4.1, 4.2**

### Property 9: 小窗口最小高度限制
*对于任何* 窗口高度（即使非常小），系统应该应用最小高度限制，确保两个区域都保持可用。
**验证: 需求 4.4**

### Property 10: Memo 内容全局存储
*对于任何* 在 Memo 区域中编辑的内容，系统应该将其保存到全局 Memo 存储键（`manifesto-global-log`），而不是任务特定的存储。
**验证: 需求 5.2**

### Property 11: 页面切换后状态恢复
*对于任何* 页面切换操作，当用户返回到 Todo 页面时，之前编辑的 Memo 内容和分割线位置应该被恢复。
**验证: 需求 5.3**

## 错误处理

1. **localStorage 读取失败**: 使用默认值（50% 分割线位置、空 Todo 列表、空 Memo 内容）
2. **JSON 解析失败**: 捕获异常并使用默认值
3. **拖动超出边界**: 应用最小高度限制（上方最小 100px，下方最小 100px）

## 测试策略

### 单元测试

- 测试分割线位置的计算逻辑
- 测试 localStorage 的读写操作
- 测试 Todo 项目的添加、删除、完成操作
- 测试 Memo 内容的保存和加载

### 集成测试

- 测试拖动分割线时上下区域的高度变化
- 测试窗口大小变化时分割线位置的保持
- 测试页面刷新后状态的恢复
- 测试 Todo 和 Memo 之间的独立性

### 手动测试

- 拖动分割线到各个位置，验证高度变化
- 调整窗口大小，验证布局响应
- 添加、删除、完成 Todo 项目
- 编辑 Memo 内容，切换编辑/预览模式
- 关闭并重新打开窗口，验证状态恢复

## 性能考虑

1. **拖动性能**: 使用 `requestAnimationFrame` 优化拖动过程中的重绘
2. **存储性能**: 使用防抖（debounce）延迟保存 Memo 内容，避免频繁写入 localStorage
3. **渲染性能**: 使用 React.memo 优化子组件的重新渲染

## 浏览器兼容性

- 支持现代浏览器（Chrome、Firefox、Safari、Edge）
- 使用标准的 DOM API 和 CSS
- 不依赖特殊的浏览器特性

## 安全考虑

- 所有用户输入都存储在本地 localStorage 中，不涉及网络传输
- Memo 内容使用 Markdown 渲染，需要确保 XSS 防护

## 可访问性

- 分割线应该有足够的点击区域（至少 10px 高度）
- 支持键盘导航（Tab 键在 Todo 和 Memo 之间切换）
- 提供适当的 ARIA 标签和角色

## 未来扩展

1. 支持触摸拖动分割线
2. 支持键盘快捷键调整分割线位置
3. 支持多个预设布局（如 1:2、2:1 等）
4. 支持全屏模式
