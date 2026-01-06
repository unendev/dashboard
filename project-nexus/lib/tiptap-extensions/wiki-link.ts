/**
 * WikiLinkExtension - 支持 [[]] 语法的双向链接
 * 
 * 功能：
 * 1. 输入 [[文本]] 自动转换为链接样式
 * 2. 点击链接可以跳转或创建新笔记
 * 3. 支持 [[标题|显示文本]] 格式
 * 
 * 示例：
 * [[我的笔记]] -> 链接到"我的笔记"
 * [[我的笔记|点击这里]] -> 显示"点击这里"，链接到"我的笔记"
 */

import { Mark, mergeAttributes, InputRule } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// Wiki Link Mark 定义
export const WikiLink = Mark.create({
  name: 'wikiLink',

  addOptions() {
    return {
      HTMLAttributes: {},
      onLinkClick: (target: string) => {
        console.log('Wiki link clicked:', target)
      },
    }
  },

  addAttributes() {
    return {
      target: {
        default: null,
        parseHTML: element => element.getAttribute('data-target'),
        renderHTML: attributes => {
          if (!attributes.target) return {}
          return { 'data-target': attributes.target }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wiki-link]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-wiki-link': 'true',
          class: 'wiki-link cursor-pointer text-cyan-400 hover:text-cyan-300 hover:underline decoration-dashed',
        }
      ),
      0,
    ]
  },

  addProseMirrorPlugins() {
    const onLinkClick = this.options.onLinkClick

    return [
      new Plugin({
        key: new PluginKey('wikiLinkClick'),
        props: {
          handleClick(_view, _pos, event) {
            const target = event.target as HTMLElement
            if (target.hasAttribute('data-wiki-link')) {
              const linkTarget = target.getAttribute('data-target')
              if (linkTarget && onLinkClick) {
                onLinkClick(linkTarget)
                return true
              }
            }
            return false
          },
        },
      }),
    ]
  },
})

// Wiki Link 输入规则
export function createWikiLinkInputRule() {
  return new InputRule({
    find: /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/,
    handler: ({ state, range, match }) => {
      const target = match[1]
      const display = match[2] || target
      
      const { tr } = state
      const start = range.from
      const end = range.to

      // 删除原始文本 [[...]]
      tr.delete(start, end)

      // 插入带有 wikiLink mark 的文本
      const wikiLinkMark = state.schema.marks.wikiLink?.create({ target })
      if (wikiLinkMark) {
        tr.insert(start, state.schema.text(display, [wikiLinkMark]))
      } else {
        // 如果 mark 不存在，只插入纯文本
        tr.insert(start, state.schema.text(display))
      }
    },
  })
}
