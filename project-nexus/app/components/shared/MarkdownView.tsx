"use client";

/**
 * MarkdownView 组件
 * 
 * 向后兼容的包装器，内部使用统一的 MarkdownRenderer
 */

import React from 'react';
import { MarkdownRenderer, type ThemeVariant } from '@/lib/markdown';

interface MarkdownViewProps {
  content: string;
  className?: string;
  variant?: 'default' | 'goc' | 'light';
}

/**
 * 将旧的 variant 映射到新的 ThemeVariant
 */
function mapVariant(variant: 'default' | 'goc' | 'light'): ThemeVariant {
  if (variant === 'default') return 'goc'; // default 映射到 goc
  return variant;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  className,
  variant = 'default'
}) => {
  return (
    <MarkdownRenderer
      content={content}
      variant={mapVariant(variant)}
      className={className}
    />
  );
};
