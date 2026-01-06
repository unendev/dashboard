'use client';

/**
 * 带悬浮大纲的Markdown渲染组件
 * 
 * 使用统一的 Markdown 系统进行渲染和大纲提取
 */

import React, { useState, useMemo } from 'react';
import { FloatingTOC } from './FloatingTOC';
import { 
  MarkdownRenderer, 
  extractHeadingsFromMarkdown,
  slugify,
} from '@/lib/markdown';

interface MarkdownWithTOCProps {
  content: string;
  className?: string;
  showTOC?: boolean;
}

/**
 * 带悬浮大纲的Markdown渲染组件
 * 自动提取标题并添加锚点ID
 */
export const MarkdownWithTOC: React.FC<MarkdownWithTOCProps> = ({
  content,
  className = '',
  showTOC = true
}) => {
  const [activeSection, setActiveSection] = useState('');

  // 使用统一的大纲提取器
  const tocSections = useMemo(() => {
    const headings = extractHeadingsFromMarkdown(content);
    
    // 转换为 FloatingTOC 需要的格式，只取 h2 级别
    return headings
      .filter(h => h.level === 2)
      .map(h => {
        // 提取emoji图标（如果有）
        const emojiMatch = h.text.match(/^([\u{1F300}-\u{1F9FF}])\s+(.+)$/u);
        const title = emojiMatch ? emojiMatch[2] : h.text;
        const icon = emojiMatch ? emojiMatch[1] : undefined;
        const id = slugify(title);
        
        return { id, title, icon };
      });
  }, [content]);

  // 处理章节点击
  const handleSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // 自定义 h2 组件添加 ID（用于锚点跳转）
  const customComponents = {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      const cleanText = text.replace(/^[\u{1F300}-\u{1F9FF}]\s+/u, '');
      const id = slugify(cleanText);
      
      return (
        <h2 id={id} className="text-2xl font-bold text-white mt-6 mb-4 scroll-mt-20" {...props}>
          {children}
        </h2>
      );
    },
  };

  return (
    <div className="relative">
      {/* 悬浮大纲 */}
      {showTOC && tocSections.length > 0 && (
        <FloatingTOC
          sections={tocSections}
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
        />
      )}

      {/* Markdown内容 */}
      <div className={`prose prose-invert max-w-none ${className}`}>
        <MarkdownRenderer
          content={content}
          variant="dark"
          components={customComponents}
        />
      </div>
    </div>
  );
};

export default MarkdownWithTOC;


