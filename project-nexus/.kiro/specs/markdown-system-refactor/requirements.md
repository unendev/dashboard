# Requirements Document

## Introduction

本项目旨在重构和统一项目中分散的 Markdown 相关逻辑。当前存在多个独立实现的 Markdown 渲染组件、编辑器组件和样式定义，导致代码重复、维护困难。

重构目标是建立两个独立但可共享设计 token 的子系统：
1. **Markdown 渲染系统**（基于 ReactMarkdown）：用于只读显示 Markdown 内容
2. **Markdown 编辑系统**（基于 TipTap）：用于富文本编辑

两者共享：主题色彩变量（设计 token）和大纲提取逻辑。

## Glossary

- **Markdown_Renderer**: 基于 ReactMarkdown 的只读渲染系统，将 Markdown 文本转换为 HTML 显示
- **Markdown_Editor**: 基于 TipTap/ProseMirror 的富文本编辑系统，支持用户编辑内容
- **Design_Token**: 共享的设计变量，如颜色、字体大小、间距等，可被渲染系统和编辑系统共同使用
- **Theme_Variant**: 样式主题变体，如 dark（深色）、light（浅色）、goc（赛博朋克风格）
- **Outline_Extractor**: 从 Markdown 文本或 TipTap 文档中提取标题结构的工具函数
- **Editor_Extension**: TipTap 编辑器的功能扩展模块

## Requirements

### Requirement 1

**User Story:** As a developer, I want shared Design_Token definitions, so that both the rendering system and editor system can use consistent colors and spacing.

#### Acceptance Criteria

1. WHEN defining theme styles THEN the system SHALL provide a centralized Design_Token configuration that includes colors, font sizes, and spacing for each Theme_Variant
2. WHEN a Theme_Variant is selected THEN both Markdown_Renderer and Markdown_Editor SHALL apply styles derived from the same Design_Token set
3. WHEN Design_Token values are updated THEN all components using that Theme_Variant SHALL reflect the changes without individual modifications

### Requirement 2

**User Story:** As a developer, I want a unified Markdown_Renderer component, so that I can render read-only Markdown content consistently across the application.

#### Acceptance Criteria

1. WHEN rendering Markdown content THEN the Markdown_Renderer SHALL provide a single component that accepts content string and Theme_Variant parameter
2. WHEN the Markdown_Renderer receives a Theme_Variant parameter THEN the component SHALL apply ReactMarkdown custom components styled according to the Design_Token
3. WHEN the Markdown_Renderer is used without explicit theme THEN the component SHALL apply the default dark Theme_Variant

### Requirement 3

**User Story:** As a developer, I want a shared Outline_Extractor utility, so that I can extract heading structures from both Markdown text and TipTap documents without duplicating logic.

#### Acceptance Criteria

1. WHEN extracting headings from Markdown text THEN the Outline_Extractor SHALL parse heading syntax and return an array of heading objects with level, text, and position
2. WHEN extracting headings from a TipTap editor document THEN the Outline_Extractor SHALL traverse the document tree and return an array of heading objects with level, text, and position
3. WHEN displaying extracted headings THEN the outline display component SHALL show hierarchical structure with indentation based on heading level

### Requirement 4

**User Story:** As a developer, I want a modular Markdown_Editor configuration factory, so that I can create TipTap editors with different feature sets without duplicating extension setup.

#### Acceptance Criteria

1. WHEN creating a TipTap editor THEN the Markdown_Editor system SHALL provide a factory function that accepts a configuration object specifying which extensions to enable
2. WHEN the factory function is called THEN the function SHALL return a configured extensions array ready for use with useEditor hook
3. WHEN an extension is disabled in configuration THEN the factory function SHALL exclude that extension from the returned array
4. WHEN the factory function is called THEN the function SHALL apply editor styles derived from the shared Design_Token

### Requirement 5

**User Story:** As a developer, I want SimpleMdEditor to be refactored into smaller focused components, so that the codebase is more maintainable.

#### Acceptance Criteria

1. WHEN the SimpleMdEditor is refactored THEN the pure editor component SHALL be separated from note management logic into distinct modules
2. WHEN the SimpleMdEditor is refactored THEN the inline CSS styles SHALL be extracted to use the shared Design_Token and editor style configuration
3. WHEN the SimpleMdEditor is refactored THEN the outline functionality SHALL use the shared Outline_Extractor utility
4. WHEN the SimpleMdEditor is refactored THEN the editor SHALL use the shared factory function from the Markdown_Editor system

### Requirement 6

**User Story:** As a developer, I want existing Markdown rendering components to be consolidated, so that the codebase has fewer redundant implementations.

#### Acceptance Criteria

1. WHEN consolidating MarkdownView component THEN the component SHALL use the unified Markdown_Renderer internally while maintaining backward-compatible API
2. WHEN consolidating MarkdownWithTOC component THEN the component SHALL use the shared Outline_Extractor for heading extraction
3. WHEN consolidating inline ReactMarkdown usages THEN those usages SHALL be replaced with the unified Markdown_Renderer component

