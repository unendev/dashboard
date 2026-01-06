'use client';

/**
 * 大纲面板组件
 * 
 * 显示文档标题结构，支持点击跳转
 */

import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTokens, type ThemeVariant } from '../tokens/design-tokens';
import type { HeadingItem } from './extractor';

export interface OutlinePanelProps {
  /** 标题列表 */
  headings: HeadingItem[];
  /** 当前活动的标题 ID */
  activeId?: string | null;
  /** 点击标题的回调 */
  onHeadingClick?: (heading: HeadingItem) => void;
  /** 主题变体 */
  variant?: ThemeVariant;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 是否显示展开/收起控制 */
  showExpandControls?: boolean;
}

/**
 * 大纲面板组件
 */
export const OutlinePanel: React.FC<OutlinePanelProps> = ({
  headings,
  activeId,
  onHeadingClick,
  variant = 'goc',
  className,
  showExpandControls = false,
}) => {
  const [expandedLevels, setExpandedLevels] = React.useState<Set<number>>(
    new Set([1, 2])
  );
  const tokens = getTokens(variant);

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
      <div
        className={cn('text-xs p-3', className)}
        style={{ color: tokens.text.muted }}
      >
        无标题
      </div>
    );
  }

  return (
    <div
      className={cn('text-xs space-y-1 p-3 overflow-y-auto', className)}
    >
      <div
        className="font-semibold mb-2"
        style={{ color: tokens.text.secondary }}
      >
        大纲
      </div>
      {headings.map((heading) => {
        const indent = (heading.level - 1) * 12;
        const isActive = activeId === heading.id;

        return (
          <div
            key={heading.id}
            style={{ marginLeft: `${indent}px` }}
            className="flex items-center gap-1"
          >
            {showExpandControls && heading.level <= 2 && (
              <button
                onClick={() => toggleLevel(heading.level)}
                className="p-0 hover:opacity-80 rounded transition-colors"
                style={{ color: tokens.heading.h1 }}
              >
                {expandedLevels.has(heading.level) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
            <button
              onClick={() => onHeadingClick?.(heading)}
              className={cn(
                'flex-1 text-left truncate transition-colors hover:opacity-80',
                isActive && 'font-semibold'
              )}
              style={{
                color: isActive
                  ? tokens.heading.h1
                  : heading.level === 1
                  ? tokens.heading.h1
                  : heading.level === 2
                  ? tokens.heading.h2
                  : tokens.text.secondary,
              }}
              title={heading.text}
            >
              {heading.text || '（无标题）'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default OutlinePanel;
