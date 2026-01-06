'use client';

/**
 * 纯净的笔记编辑器组件
 * 
 * 基于 TipTap，使用统一的 Markdown 系统配置
 * 只负责编辑功能，不包含笔记管理逻辑
 */

import React, { useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import {
  createEditorExtensions,
  getEditorStyles,
  extractHeadingsFromEditor,
  type EditorConfig,
  type ThemeVariant,
  type HeadingItem,
} from '@/lib/markdown';

export interface NoteEditorProps {
  /** 初始内容 */
  content?: string;
  /** 内容变化回调 */
  onChange?: (html: string) => void;
  /** 选择变化回调 */
  onSelectionChange?: (editor: TiptapEditor) => void;
  /** 编辑器创建回调 */
  onCreate?: (editor: TiptapEditor) => void;
  /** 大纲变化回调 */
  onOutlineChange?: (headings: HeadingItem[]) => void;
  /** 主题变体 */
  variant?: ThemeVariant;
  /** 编辑器配置 */
  config?: Partial<EditorConfig>;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 图片上传处理 */
  onImageUpload?: (file: File) => Promise<string>;
}

/**
 * 纯净的笔记编辑器组件
 */
export const NoteEditor: React.FC<NoteEditorProps> = ({
  content = '',
  onChange,
  onSelectionChange,
  onCreate,
  onOutlineChange,
  variant = 'goc',
  config = {},
  className = '',
  disabled = false,
  onImageUpload,
}) => {
  // 生成编辑器样式
  const editorStyles = useMemo(() => getEditorStyles(variant), [variant]);

  // 构建大纲
  const buildOutline = useCallback(
    (editor: TiptapEditor) => {
      const headings = extractHeadingsFromEditor(editor);
      onOutlineChange?.(headings);
    },
    [onOutlineChange]
  );

  // 创建编辑器扩展
  const extensions = useMemo(() => {
    return createEditorExtensions({
      placeholder: '开始写笔记...',
      enableTypography: true,
      enableImage: true,
      enableResizableImage: true,
      enableDeleteLine: true,
      enableSwapLine: true,
      enableAutoOrderList: true,
      enableDetails: true,
      enableWikiLink: false,
      ...config,
    });
  }, [config]);

  // 创建编辑器
  const editor = useEditor({
    immediatelyRender: false,
    content,
    extensions,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none min-h-[200px] md:min-h-[400px] px-4 py-3 ${className}`,
      },
      handlePaste: onImageUpload
        ? (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.indexOf('image') === 0) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                  onImageUpload(file)
                    .then((url) => {
                      const { state, dispatch } = view;
                      const node = state.schema.nodes.image.create({ src: url });
                      const transaction = state.tr.replaceSelectionWith(node);
                      dispatch(transaction);
                    })
                    .catch((error) => {
                      console.error('❌ 图片上传失败:', error);
                    });
                }
                return true;
              }
            }
            return false;
          }
        : undefined,
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
      buildOutline(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      onSelectionChange?.(editor);
      buildOutline(editor);
    },
    onCreate: ({ editor }) => {
      onCreate?.(editor);
      buildOutline(editor);
    },
  });

  return (
    <>
      <style jsx global>
        {editorStyles}
      </style>
      <EditorContent editor={editor} />
    </>
  );
};

export default NoteEditor;
