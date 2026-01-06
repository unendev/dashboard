/**
 * Markdown 系统统一导出
 * 
 * 提供渲染、编辑、大纲和样式的统一 API
 */

// ============ Design Tokens ============
export {
  getTokens,
  isTokensComplete,
  gocTokens,
  darkTokens,
  lightTokens,
  type ThemeVariant,
  type DesignTokens,
} from './tokens/design-tokens';

// ============ Markdown Renderer ============
export {
  MarkdownRenderer,
  type MarkdownRendererProps,
} from './renderer/MarkdownRenderer';

export { createMarkdownComponents } from './renderer/components';

// ============ Outline Extractor ============
export {
  extractHeadingsFromMarkdown,
  extractHeadingsFromEditor,
  findActiveHeading,
  slugify,
  type HeadingItem,
} from './outline/extractor';

export {
  OutlinePanel,
  type OutlinePanelProps,
} from './outline/OutlinePanel';

// ============ Editor Factory ============
export {
  createEditorExtensions,
  createResizableImage,
  DeleteLineExtension,
  defaultEditorConfig,
  type EditorConfig,
} from './editor/editor-factory';

export {
  getEditorStyles,
  editorProseClass,
} from './editor/editor-styles';
