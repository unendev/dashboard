# 藏宝阁 AI 标签助手

## 功能概述

AI标签助手是藏宝阁的智能辅助功能，帮助用户优化标签体系，提供领域和概念标签建议。

## 核心特性

### 1. 全局侧栏设计
- 固定在页面右侧，宽度400px
- 可通过右下角的紫色渐变按钮打开/关闭
- 支持对话历史持久化（localStorage）

### 2. 智能上下文检测
当用户打开创建或编辑宝藏的弹窗时，AI助手会自动检测并接收以下上下文：
- **标题**：当前宝藏的标题
- **内容**：当前宝藏的正文内容
- **人类标签**：仅包含 `#领域/` 和 `#概念/` 标签（排除AI自动生成的 `#实体/` 和 `#性质/` 标签）

### 3. 标签体系说明

| 标签类型 | 格式 | 管理方式 | 示例 |
|---------|------|---------|------|
| **领域** | `#领域/...` | 👤 人类管理 | `#领域/技术/前端` |
| **概念** | `#概念/...` | 👤 人类管理 | `#概念/创新` |
| **实体** | `#实体/...` | 🤖 AI自动生成 | `#实体/技术/React` |
| **性质** | `#性质/...` | 🤖 AI自动生成 | `#性质/教程` |

**AI助手职责**：仅建议 `#领域/` 和 `#概念/` 标签

## 使用流程

### 1. 打开AI助手
点击藏宝阁页面右下角的紫色渐变按钮（Sparkles图标）

### 2. 查看上下文状态
- **创建模式**（绿色徽章）：正在创建新宝藏
- **编辑模式**（蓝色徽章）：正在编辑现有宝藏
- **浏览模式**（紫色徽章）：无特定上下文，通用对话

### 3. 与AI对话
- 输入问题，例如："请为这个宝藏推荐合适的领域标签"
- AI会基于当前上下文（标题、内容、已选标签）提供建议
- 建议会优先复用已有标签池中的标签

### 4. 手动应用标签
- 复制AI建议的标签
- 粘贴到宝藏创建/编辑弹窗的标签输入框

## 技术架构

### 核心组件
1. **TreasureAIAssistantSidebar** (`app/components/features/treasure/TreasureAIAssistantSidebar.tsx`)
   - 侧栏UI组件
   - 使用 `useChat` hook（Vercel AI SDK）
   - 支持对话历史持久化

2. **useTreasureAIAssistant** (`app/store/treasure-ai-assistant.ts`)
   - Zustand全局状态管理
   - 管理侧栏开关状态和上下文信息

3. **API端点** (`app/api/chat/treasure-assistant/route.ts`)
   - 专用AI对话端点
   - 根据上下文类型动态注入系统提示词
   - 提供标签池信息（已有的领域和概念标签）

### 上下文检测机制
在 `TreasureInputModal` 组件中：
```typescript
useEffect(() => {
  if (isOpen && initialData) {
    const humanTags = (initialData.tags || []).filter(
      tag => tag.startsWith('#领域/') || tag.startsWith('#概念/')
    )
    
    setContext({
      type: mode === 'edit' ? 'edit' : 'create',
      treasureData: {
        title: initialData.title || '未命名',
        content: initialData.content || '',
        tags: humanTags,
      },
    })
  }
}, [isOpen, initialData, mode])
```

## 未来扩展

### 可能的增强方向
1. **自动应用标签**：AI建议后直接添加到标签输入框（需要状态同步）
2. **批量标签优化**：选择多个宝藏，批量优化标签
3. **标签关系图谱**：可视化标签之间的关联关系
4. **跨模块支持**：扩展到Timer、GOC等其他模块

## 注意事项

1. **手动复制粘贴**：当前版本采用敏捷开发策略，用户需要手动复制AI建议的标签
2. **对话历史**：存储在 `localStorage`，清除浏览器缓存会丢失历史记录
3. **上下文限制**：仅在创建/编辑弹窗打开时提供宝藏上下文，关闭后恢复浏览模式
