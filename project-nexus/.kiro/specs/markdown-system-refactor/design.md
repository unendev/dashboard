# Design Document

## Overview

本设计文档描述 Markdown 系统重构的技术架构。系统分为两个独立子系统：
- **Markdown Renderer**：基于 ReactMarkdown 的只读渲染系统
- **Markdown Editor**：基于 TipTap 的富文本编辑系统

两者通过共享的 Design Token 和 Outline Extractor 保持视觉和功能一致性。主色调采用 GOC（赛博朋克/战术深色）风格。

## Architecture

```
lib/markdown/
├── tokens/
│   └── design-tokens.ts      # 共享设计变量（颜色、字体、间距）
├── renderer/
│   ├── MarkdownRenderer.tsx  # 统一渲染组件
│   └── components.ts         # ReactMarkdown 自定义组件配置
├── editor/
│   ├── editor-factory.ts     # TipTap 编辑器工厂函数
│   └── editor-styles.ts      # 编辑器 ProseMirror 样式
├── outline/
│   ├── extractor.ts          # 大纲提取工具（支持 MD 文本和 TipTap 文档）
│   └── OutlinePanel.tsx      # 大纲显示组件
└── index.ts                  # 统一导出
```

## Components and Interfaces

### 1. Design Tokens (`lib/markdown/tokens/design-tokens.ts`)

```typescript
export type ThemeVariant = 'goc' | 'dark' | 'light';

export interface DesignTokens {
  // 文本颜色
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  // 标题颜色
  heading: {
    h1: string;
    h2: string;
    h3: string;
  };
  // 代码
  code: {
    background: string;
    text: string;
    border: string;
  };
  // 引用
  blockquote: {
    border: string;
    background: string;
    text: string;
  };
  // 链接
  link: {
    color: string;
    hoverColor: string;
  };
  // 背景
  background: {
    primary: string;
    secondary: string;
  };
}

export const gocTokens: DesignTokens = {
  text: {
    primary: '#e5e7eb',      // zinc-200
    secondary: '#a1a1aa',    // zinc-400
    muted: '#71717a',        // zinc-500
  },
  heading: {
    h1: '#22d3ee',           // cyan-400
    h2: '#a5f3fc',           // cyan-200
    h3: '#cffafe',           // cyan-100
  },
  code: {
    background: 'rgba(0,0,0,0.5)',
    text: '#67e8f9',         // cyan-300
    border: 'rgba(255,255,255,0.1)',
  },
  blockquote: {
    border: 'rgba(34,211,238,0.5)', // cyan-400/50
    background: 'rgba(255,255,255,0.05)',
    text: '#a1a1aa',
  },
  link: {
    color: '#22d3ee',
    hoverColor: '#67e8f9',
  },
  background: {
    primary: '#18181b',      // zinc-900
    secondary: '#27272a',    // zinc-800
  },
};

export function getTokens(variant: ThemeVariant): DesignTokens;
```

### 2. Markdown Renderer (`lib/markdown/renderer/MarkdownRenderer.tsx`)

```typescript
export interface MarkdownRendererProps {
  content: string;
  variant?: ThemeVariant;
  className?: string;
  // 可选：自定义组件覆盖
  components?: Partial<Components>;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps>;
```

### 3. Outline Extractor (`lib/markdown/outline/extractor.ts`)

```typescript
export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;  // 字符位置（MD文本）或节点位置（TipTap）
}

// 从 Markdown 文本提取
export function extractHeadingsFromMarkdown(content: string): HeadingItem[];

// 从 TipTap Editor 提取
export function extractHeadingsFromEditor(editor: Editor): HeadingItem[];

// 生成 slug ID
export function slugify(text: string): string;
```

### 4. Outline Panel (`lib/markdown/outline/OutlinePanel.tsx`)

```typescript
export interface OutlinePanelProps {
  headings: HeadingItem[];
  activeId?: string;
  onHeadingClick?: (heading: HeadingItem) => void;
  variant?: ThemeVariant;
  className?: string;
}

export const OutlinePanel: React.FC<OutlinePanelProps>;
```

### 5. Editor Factory (`lib/markdown/editor/editor-factory.ts`)

```typescript
export interface EditorConfig {
  placeholder?: string;
  variant?: ThemeVariant;
  // 扩展开关
  enableTypography?: boolean;
  enableImage?: boolean;
  enableResizableImage?: boolean;
  enableDeleteLine?: boolean;
  enableSwapLine?: boolean;
  enableAutoOrderList?: boolean;
  enableDetails?: boolean;
  enableWikiLink?: boolean;
  // 回调
  wikiLinkOnClick?: (target: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

export function createEditorExtensions(config: EditorConfig): Extension[];
export function getEditorStyles(variant: ThemeVariant): string;
```

## Data Models

### HeadingItem
```typescript
interface HeadingItem {
  id: string;      // 唯一标识，用于锚点跳转
  level: number;   // 1-6，对应 h1-h6
  text: string;    // 标题文本内容
  pos: number;     // 位置信息
}
```

### ThemeVariant
```typescript
type ThemeVariant = 'goc' | 'dark' | 'light';
// goc: 赛博朋克风格（主要）- cyan 色调
// dark: 标准深色 - 灰色调
// light: 浅色 - 用于特定场景如藏宝阁
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Design Token Completeness
*For any* ThemeVariant value, calling `getTokens(variant)` should return a DesignTokens object with all required fields (text, heading, code, blockquote, link, background) populated with non-empty string values.
**Validates: Requirements 1.1**

### Property 2: Token Consistency Across Systems
*For any* ThemeVariant, the CSS color values used by MarkdownRenderer and the editor styles generated by getEditorStyles should match the corresponding values from getTokens for that variant.
**Validates: Requirements 1.2, 2.2, 4.4**

### Property 3: Renderer Accepts Valid Input
*For any* valid Markdown string and any ThemeVariant, the MarkdownRenderer component should render without throwing an error.
**Validates: Requirements 2.1**

### Property 4: Markdown Heading Extraction Correctness
*For any* Markdown string containing headings (lines starting with 1-6 `#` characters followed by space and text), `extractHeadingsFromMarkdown` should return an array where each item has: level matching the number of `#` characters, text matching the heading content, and pos indicating the character offset.
**Validates: Requirements 3.1**

### Property 5: TipTap Heading Extraction Correctness
*For any* TipTap document containing heading nodes, `extractHeadingsFromEditor` should return an array where each item has: level matching the heading node's level attribute, text matching the node's text content, and pos indicating the node position.
**Validates: Requirements 3.2**

### Property 6: Outline Indentation by Level
*For any* array of HeadingItem objects, the OutlinePanel should render each item with indentation proportional to its level (higher level = more indentation).
**Validates: Requirements 3.3**

### Property 7: Extension Factory Returns Array
*For any* valid EditorConfig object, `createEditorExtensions(config)` should return an array of Extension objects.
**Validates: Requirements 4.1, 4.2**

### Property 8: Extension Exclusion by Config
*For any* EditorConfig where a specific extension flag (e.g., enableTypography, enableImage) is set to false, the returned extensions array should not contain that extension.
**Validates: Requirements 4.3**

## Error Handling

### Design Token Errors
- If an unknown ThemeVariant is passed to `getTokens()`, the function should fall back to 'goc' variant and log a warning
- Token values should never be undefined or null

### Renderer Errors
- If content is null or undefined, render empty content without error
- If an invalid variant is passed, fall back to 'goc' variant

### Outline Extractor Errors
- If content is empty or null, return empty array
- If editor instance is null, return empty array
- Malformed heading syntax should be skipped without error

### Editor Factory Errors
- If config is null or undefined, use default configuration
- Invalid extension configurations should be ignored with warning

## Testing Strategy

### Unit Testing
- Test `getTokens()` returns complete token objects for each variant
- Test `extractHeadingsFromMarkdown()` with various heading formats
- Test `extractHeadingsFromEditor()` with mock TipTap documents
- Test `createEditorExtensions()` with various config combinations
- Test `slugify()` with edge cases (empty, special chars, CJK)

### Property-Based Testing
Using `fast-check` library for property-based testing:

1. **Token Completeness Property**: Generate random ThemeVariant, verify all token fields exist
2. **Heading Extraction Property**: Generate random Markdown with headings, verify extraction accuracy
3. **Extension Exclusion Property**: Generate random EditorConfig, verify disabled extensions are excluded
4. **Renderer Stability Property**: Generate random Markdown content, verify no render errors

### Integration Testing
- Test MarkdownRenderer renders correctly with each theme variant
- Test OutlinePanel displays correct hierarchy
- Test editor factory produces working editor configurations
- Test migrated components maintain backward compatibility

