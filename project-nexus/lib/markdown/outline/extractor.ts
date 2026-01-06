/**
 * 大纲提取工具
 * 
 * 从 Markdown 文本或 TipTap 编辑器文档中提取标题结构
 */

import type { Editor } from '@tiptap/core';

/**
 * 标题项接口
 */
export interface HeadingItem {
  /** 唯一标识，用于锚点跳转 */
  id: string;
  /** 标题级别 1-6 */
  level: number;
  /** 标题文本内容 */
  text: string;
  /** 位置信息（字符偏移或节点位置） */
  pos: number;
}

/**
 * 将文本转换为 URL 友好的 slug
 * @param text 原始文本
 * @returns slug 字符串
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // 保留中文、字母、数字、空格和连字符
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    // 空格转连字符
    .replace(/\s+/g, '-')
    // 多个连字符合并
    .replace(/-+/g, '-')
    // 去除首尾连字符
    .replace(/^-|-$/g, '')
    // 限制长度
    .slice(0, 80);
}

/**
 * 从 Markdown 文本中提取标题
 * @param content Markdown 文本内容
 * @returns 标题项数组
 */
export function extractHeadingsFromMarkdown(content: string): HeadingItem[] {
  if (!content) {
    return [];
  }

  const headings: HeadingItem[] = [];
  const lines = content.split('\n');
  let offset = 0;

  for (const line of lines) {
    // 匹配 Markdown 标题语法: # 到 ###### 
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = slugify(text);
      const id = slug ? `${slug}-${offset}` : `heading-${offset}`;
      
      headings.push({
        id,
        level,
        text,
        pos: offset,
      });
    }
    // 更新偏移量（+1 是换行符）
    offset += line.length + 1;
  }

  return headings;
}

/**
 * 从 TipTap 编辑器文档中提取标题
 * @param editor TipTap 编辑器实例
 * @returns 标题项数组
 */
export function extractHeadingsFromEditor(editor: Editor | null): HeadingItem[] {
  if (!editor) {
    return [];
  }

  const headings: HeadingItem[] = [];
  
  try {
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const level = (node.attrs as { level?: number })?.level ?? 1;
        const text = node.textContent || '';
        const slug = slugify(text);
        const id = slug ? `${slug}-${pos}` : `heading-${pos}`;
        
        headings.push({
          id,
          level,
          text,
          pos,
        });
      }
    });
  } catch (error) {
    console.error('Error extracting headings from editor:', error);
  }

  return headings;
}

/**
 * 根据当前位置找到活动的标题
 * @param headings 标题数组
 * @param currentPos 当前光标位置
 * @returns 活动标题的 ID，如果没有则返回第一个标题的 ID
 */
export function findActiveHeading(headings: HeadingItem[], currentPos: number): string | null {
  if (headings.length === 0) {
    return null;
  }

  // 找到位置小于等于当前位置的最后一个标题
  const activeHeading = headings
    .filter(h => h.pos <= currentPos)
    .sort((a, b) => b.pos - a.pos)[0];

  return activeHeading?.id ?? headings[0]?.id ?? null;
}
