/**
 * TipTap/ProseMirror 编辑器样式生成
 * 
 * 根据 Design Token 生成编辑器 CSS 样式
 */

import { getTokens, type ThemeVariant } from '../tokens/design-tokens';

/**
 * 生成编辑器 ProseMirror 样式
 * @param variant 主题变体
 * @returns CSS 样式字符串
 */
export function getEditorStyles(variant: ThemeVariant = 'goc'): string {
  const tokens = getTokens(variant);

  return `
    /* TipTap/ProseMirror 编辑器样式 */
    .ProseMirror {
      outline: none;
      padding: 1rem;
      color: ${tokens.text.primary};
    }

    /* 有序列表样式 */
    .ProseMirror ol {
      list-style-type: decimal;
      padding-left: 1.5rem;
      margin: 0.75rem 0;
    }

    /* 无序列表样式 */
    .ProseMirror ul {
      list-style-type: disc;
      padding-left: 1.5rem;
      margin: 0.75rem 0;
    }

    /* 列表项样式 */
    .ProseMirror li {
      margin: 0.25rem 0;
      padding-left: 0.25rem;
      color: ${tokens.list.text};
    }

    /* 嵌套列表 */
    .ProseMirror li > ol,
    .ProseMirror li > ul {
      margin: 0.25rem 0;
    }

    /* 二级无序列表使用空心圆 */
    .ProseMirror ul ul {
      list-style-type: circle;
    }

    /* 三级无序列表使用方块 */
    .ProseMirror ul ul ul {
      list-style-type: square;
    }

    /* 粗体样式 */
    .ProseMirror strong {
      font-weight: 700;
      color: ${tokens.text.primary};
    }

    /* 斜体样式 */
    .ProseMirror em {
      font-style: italic;
      color: ${tokens.text.secondary};
    }

    /* 标题样式 */
    .ProseMirror h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 1.5rem 0 1rem;
      color: ${tokens.heading.h1};
      line-height: 1.2;
    }

    .ProseMirror h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 1.25rem 0 0.75rem;
      color: ${tokens.heading.h2};
      line-height: 1.3;
    }

    .ProseMirror h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 1rem 0 0.5rem;
      color: ${tokens.heading.h3};
      line-height: 1.4;
    }

    /* 段落样式 */
    .ProseMirror p {
      margin: 0.75rem 0;
      line-height: 1.6;
      color: ${tokens.text.primary};
    }

    /* 代码块样式 */
    .ProseMirror code {
      background-color: ${tokens.code.background};
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: ${tokens.code.text};
    }

    .ProseMirror pre {
      background-color: ${tokens.background.secondary};
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin: 1rem 0;
      border: 1px solid ${tokens.code.border};
    }

    .ProseMirror pre code {
      background-color: transparent;
      padding: 0;
      color: ${tokens.text.primary};
    }

    /* 引用样式 */
    .ProseMirror blockquote {
      border-left: 4px solid ${tokens.blockquote.border};
      padding-left: 1rem;
      margin: 1rem 0;
      color: ${tokens.blockquote.text};
      font-style: italic;
      background-color: ${tokens.blockquote.background};
      padding: 0.5rem 1rem;
      border-radius: 0 0.25rem 0.25rem 0;
    }

    /* 水平分割线 */
    .ProseMirror hr {
      border: none;
      border-top: 2px solid ${tokens.text.muted};
      margin: 1.5rem 0;
    }

    /* 链接样式 */
    .ProseMirror a {
      color: ${tokens.link.color};
      text-decoration: underline;
      cursor: pointer;
    }

    .ProseMirror a:hover {
      color: ${tokens.link.hoverColor};
    }

    /* 图片样式 */
    .ProseMirror img,
    .tiptap-image {
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }

    /* 图片调整手柄样式 */
    .image-resizer {
      position: relative;
      display: inline-block;
      max-width: 100%;
    }

    .image-resize-handle {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 20px;
      height: 20px;
      background-color: ${tokens.link.color};
      cursor: nwse-resize;
      border-radius: 0 0 4px 0;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .image-resizer:hover .image-resize-handle {
      opacity: 0.8;
    }

    .image-resizer.resizing .image-resize-handle {
      opacity: 1;
    }

    /* 折叠块样式 */
    .ProseMirror details {
      border: 1px solid ${tokens.text.muted};
      border-radius: 0.5rem;
      padding: 0;
      margin: 1rem 0;
      background-color: ${tokens.background.secondary};
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .ProseMirror details:hover {
      border-color: ${tokens.text.secondary};
    }

    .ProseMirror details[open] {
      border-color: ${tokens.link.color};
    }

    .ProseMirror details summary {
      padding: 0.75rem 1rem;
      cursor: pointer;
      font-weight: 500;
      color: ${tokens.text.primary};
      background-color: ${tokens.background.secondary};
      user-select: none;
      display: flex;
      align-items: center;
      transition: all 0.15s ease;
    }

    .ProseMirror details summary:hover {
      background-color: ${tokens.background.primary};
    }

    .ProseMirror details[open] summary {
      background-color: ${tokens.link.color};
      color: #ffffff;
      border-bottom: 1px solid ${tokens.link.hoverColor};
    }

    .ProseMirror details summary::marker,
    .ProseMirror details summary::-webkit-details-marker {
      content: '';
      display: none;
    }

    .ProseMirror details summary::before {
      content: '▶';
      display: inline-block;
      margin-right: 0.5rem;
      transition: transform 0.2s ease;
      font-size: 0.75rem;
      color: ${tokens.text.muted};
    }

    .ProseMirror details[open] summary::before {
      transform: rotate(90deg);
      color: #ffffff;
    }

    .ProseMirror .details-content {
      padding: 1rem;
      color: ${tokens.text.primary};
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .ProseMirror .details-content > p:first-child {
      margin-top: 0;
    }

    .ProseMirror .details-content > p:last-child {
      margin-bottom: 0;
    }
  `;
}

/**
 * 编辑器 prose 样式类
 */
export const editorProseClass = 'prose prose-invert max-w-none focus:outline-none';
