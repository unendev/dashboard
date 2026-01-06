"use client";

/**
 * Markdown 大纲组件
 * 
 * 使用统一的大纲提取器
 */

import React, { useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  extractHeadingsFromMarkdown, 
  getTokens,
} from '@/lib/markdown';

interface MarkdownOutlineProps {
  content: string;
  onHeadingClick?: (offset: number) => void;
  className?: string;
}

export const MarkdownOutline: React.FC<MarkdownOutlineProps> = ({
  content,
  onHeadingClick,
  className
}) => {
  const [expandedLevels, setExpandedLevels] = React.useState<Set<number>>(new Set([1, 2]));
  const tokens = getTokens('goc');

  // 使用统一的大纲提取器
  const headings = useMemo(() => {
    return extractHeadingsFromMarkdown(content);
  }, [content]);

  const toggleLevel = (level: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedLevels(newExpanded);
  };

  if (headings.length === 0) {
    return (
      <div className={cn("text-xs p-3", className)} style={{ color: tokens.text.muted }}>
        无标题
      </div>
    );
  }

  return (
    <div className={cn("text-xs space-y-1 p-3 overflow-y-auto", className)}>
      <div className="font-semibold mb-2" style={{ color: tokens.text.secondary }}>大纲</div>
      {headings.map((heading) => {
        const isVisible = expandedLevels.has(heading.level);
        const indent = (heading.level - 1) * 12;

        return (
          <div
            key={heading.id}
            style={{ marginLeft: `${indent}px` }}
            className="flex items-center gap-1"
          >
            {heading.level <= 2 && (
              <button
                onClick={() => toggleLevel(heading.level)}
                className="p-0 hover:bg-white/10 rounded transition-colors"
              >
                {isVisible ? (
                  <ChevronDown className="w-3 h-3" style={{ color: tokens.heading.h1 }} />
                ) : (
                  <ChevronRight className="w-3 h-3" style={{ color: tokens.heading.h1 }} />
                )}
              </button>
            )}
            <button
              onClick={() => onHeadingClick?.(heading.pos)}
              className="flex-1 text-left truncate transition-colors hover:opacity-80"
              style={{
                color: heading.level === 1 
                  ? tokens.heading.h1 
                  : heading.level === 2 
                  ? tokens.heading.h2 
                  : tokens.text.secondary,
                fontWeight: heading.level === 1 ? 600 : 400,
              }}
              title={heading.text}
            >
              {heading.text}
            </button>
          </div>
        );
      })}
    </div>
  );
};
