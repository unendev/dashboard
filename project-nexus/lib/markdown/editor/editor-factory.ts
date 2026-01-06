/**
 * TipTap 编辑器工厂
 * 
 * 提供模块化的编辑器扩展配置
 */

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import { Extension, mergeAttributes } from '@tiptap/core';
import { SwapLineExtension } from '@/lib/swap-line-extension';
import { AutoOrderListExtension } from '@/lib/tiptap-extensions/auto-order-list';
import { Details } from '@/lib/tiptap-extensions/details';
import { DetailsSummary } from '@/lib/tiptap-extensions/details-summary';
import { DetailsContent } from '@/lib/tiptap-extensions/details-content';
import { WikiLink, createWikiLinkInputRule } from '@/lib/tiptap-extensions/wiki-link';
import type { ThemeVariant } from '../tokens/design-tokens';

/**
 * 编辑器配置接口
 */
export interface EditorConfig {
  /** 占位符文本 */
  placeholder?: string;
  /** 主题变体 */
  variant?: ThemeVariant;
  /** 启用排版优化 */
  enableTypography?: boolean;
  /** 启用图片 */
  enableImage?: boolean;
  /** 启用可调整大小的图片 */
  enableResizableImage?: boolean;
  /** 启用删除行快捷键 (Ctrl+D) */
  enableDeleteLine?: boolean;
  /** 启用交换行快捷键 */
  enableSwapLine?: boolean;
  /** 启用自动有序列表 */
  enableAutoOrderList?: boolean;
  /** 启用折叠块 */
  enableDetails?: boolean;
  /** 启用 Wiki 链接 */
  enableWikiLink?: boolean;
  /** Wiki 链接点击回调 */
  wikiLinkOnClick?: (target: string) => void;
}

/**
 * Ctrl+D 删除行扩展
 */
export const DeleteLineExtension = Extension.create({
  name: 'deleteLine',

  addKeyboardShortcuts() {
    return {
      'Mod-d': () => {
        try {
          const { state } = this.editor;
          const { $from } = state.selection;

          let targetNode = null;
          let targetDepth = 0;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);

            if (node.type.name === 'listItem') {
              targetNode = node;
              targetDepth = d;
              break;
            } else if (node.type.name === 'heading') {
              targetNode = node;
              targetDepth = d;
              break;
            } else if (node.type.name === 'paragraph' && !targetNode) {
              targetNode = node;
              targetDepth = d;
            }
          }

          if (targetNode && targetDepth > 0) {
            const pos = $from.before(targetDepth);
            const nodeSize = targetNode.nodeSize;
            return this.editor.commands.deleteRange({
              from: pos,
              to: pos + nodeSize,
            });
          }

          const start = $from.start();
          const end = $from.end();
          if (start !== undefined && end !== undefined) {
            return this.editor.commands.deleteRange({ from: start, to: end });
          }

          return false;
        } catch (error) {
          console.error('DeleteLineExtension error:', error);
          return false;
        }
      },
    };
  },
});

/**
 * 创建可调整大小的图片扩展
 */
export function createResizableImage(isMobile: boolean = false) {
  return Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: null,
          parseHTML: (element) => element.getAttribute('width'),
          renderHTML: (attributes) => {
            if (!attributes.width) return {};
            return { width: attributes.width };
          },
        },
        height: {
          default: null,
          parseHTML: (element) => element.getAttribute('height'),
          renderHTML: (attributes) => {
            if (!attributes.height) return {};
            return { height: attributes.height };
          },
        },
      };
    },

    addNodeView() {
      return ({ node, editor, getPos }) => {
        const container = document.createElement('div');
        container.className = 'image-resizer';
        container.contentEditable = 'false';

        const img = document.createElement('img');
        img.src = node.attrs.src;
        img.alt = node.attrs.alt || '';
        img.className = 'tiptap-image';

        if (node.attrs.width) {
          img.style.width = node.attrs.width + 'px';
        }

        img.addEventListener('dblclick', () => {
          img.style.width = '';
          if (typeof getPos === 'function') {
            editor.commands.updateAttributes('image', {
              width: null,
              height: null,
            });
          }
        });

        if (!isMobile) {
          const resizeHandle = document.createElement('div');
          resizeHandle.className = 'image-resize-handle';

          let isResizing = false;
          let startX = 0;
          let startWidth = 0;

          resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startWidth = img.offsetWidth;

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            container.classList.add('resizing');
          });

          const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const diff = e.clientX - startX;
            const newWidth = Math.max(100, startWidth + diff);
            img.style.width = newWidth + 'px';
          };

          const handleMouseUp = () => {
            if (!isResizing) return;
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            container.classList.remove('resizing');

            if (typeof getPos === 'function') {
              const width = img.offsetWidth;
              const height = img.offsetHeight;
              editor.commands.updateAttributes('image', { width, height });
            }
          };

          container.appendChild(img);
          container.appendChild(resizeHandle);
        } else {
          container.appendChild(img);
        }

        return {
          dom: container,
          contentDOM: null,
          ignoreMutation: () => true,
        };
      };
    },

    renderHTML({ HTMLAttributes }) {
      return [
        'img',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          draggable: 'false',
          contenteditable: 'false',
        }),
      ];
    },
  });
}

/**
 * 检测是否为移动设备
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768
  );
}

/**
 * 创建编辑器扩展数组
 * @param config 编辑器配置
 * @returns TipTap 扩展数组
 */
export function createEditorExtensions(config: EditorConfig = {}): Extension[] {
  const {
    placeholder = '开始写作...',
    enableTypography = true,
    enableImage = true,
    enableResizableImage = false,
    enableDeleteLine = true,
    enableSwapLine = true,
    enableAutoOrderList = true,
    enableDetails = false,
    enableWikiLink = false,
    wikiLinkOnClick,
  } = config;

  const isMobile = isMobileDevice();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: any[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bold: { HTMLAttributes: { class: 'font-bold' } },
      italic: { HTMLAttributes: { class: 'italic' } },
    }),
    Placeholder.configure({ placeholder }),
  ];

  if (enableTypography) {
    extensions.push(Typography);
  }

  if (enableImage) {
    if (enableResizableImage) {
      extensions.push(
        createResizableImage(isMobile).configure({
          allowBase64: true,
          HTMLAttributes: { class: 'tiptap-image' },
        })
      );
    } else {
      extensions.push(
        Image.configure({
          inline: true,
          HTMLAttributes: { class: 'max-w-full rounded-lg' },
        })
      );
    }
  }

  if (enableDeleteLine) {
    extensions.push(DeleteLineExtension);
  }

  if (enableSwapLine) {
    extensions.push(SwapLineExtension);
  }

  if (enableAutoOrderList) {
    extensions.push(AutoOrderListExtension);
  }

  if (enableDetails) {
    extensions.push(Details, DetailsSummary, DetailsContent);
  }

  if (enableWikiLink) {
    extensions.push(
      WikiLink.configure({
        onLinkClick:
          wikiLinkOnClick ||
          ((target: string) => console.log('Wiki link clicked:', target)),
      }),
      Extension.create({
        name: 'wikiLinkInputRule',
        addInputRules() {
          return [createWikiLinkInputRule()];
        },
      })
    );
  }

  return extensions;
}

/**
 * 默认编辑器配置
 */
export const defaultEditorConfig: EditorConfig = {
  placeholder: '开始写作...',
  variant: 'goc',
  enableTypography: true,
  enableImage: true,
  enableResizableImage: false,
  enableDeleteLine: true,
  enableSwapLine: true,
  enableAutoOrderList: true,
  enableDetails: false,
  enableWikiLink: false,
};
