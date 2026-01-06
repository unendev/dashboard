'use client';

/**
 * 统一的 Markdown 渲染组件
 * 
 * 基于 ReactMarkdown，使用共享的 Design Token 进行样式化
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { getTokens, type ThemeVariant } from '../tokens/design-tokens';
import { createMarkdownComponents } from './components';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PluggableList = any[];

export interface MarkdownRendererProps {
  /** Markdown 内容 */
  content: string;
  /** 主题变体，默认 'goc' */
  variant?: ThemeVariant;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 自定义组件覆盖 */
  components?: Partial<Components>;
  /** 额外的 remark 插件 */
  remarkPlugins?: PluggableList;
  /** rehype 插件（如代码高亮） */
  rehypePlugins?: PluggableList;
}

/**
 * 统一的 Markdown 渲染组件
 * 
 * @example
 * ```tsx
 * <MarkdownRenderer content="# Hello" variant="goc" />
 * // 带代码高亮
 * <MarkdownRenderer content={code} rehypePlugins={[rehypeHighlight]} />
 * ```
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  variant = 'goc',
  className,
  components: customComponents,
  remarkPlugins = [],
  rehypePlugins = [],
}) => {
  // 获取主题 token 并创建组件
  const markdownComponents = useMemo(() => {
    const tokens = getTokens(variant);
    const baseComponents = createMarkdownComponents(tokens);
    
    // 合并自定义组件
    if (customComponents) {
      return { ...baseComponents, ...customComponents };
    }
    return baseComponents;
  }, [variant, customComponents]);

  // 处理空内容
  if (!content) {
    return null;
  }

  return (
    <div className={cn('markdown-renderer w-full', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, ...remarkPlugins]}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
