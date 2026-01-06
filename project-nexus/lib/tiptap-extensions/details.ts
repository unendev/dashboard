import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Details 扩展 - 折叠块容器
 * 
 * 使用方法：
 * 1. 快捷键 Cmd/Ctrl + Shift + D 插入折叠块
 * 2. 点击 Summary 区域展开/折叠内容
 * 3. 支持嵌套使用
 * 
 * HTML 结构：
 * <details open>
 *   <summary>标题文本</summary>
 *   <div>内容区域</div>
 * </details>
 */
export const Details = Node.create({
  name: 'details',
  
  group: 'block',
  
  content: 'detailsSummary detailsContent',
  
  defining: true,
  
  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: element => element.hasAttribute('open'),
        renderHTML: attributes => {
          if (attributes.open) {
            return { open: '' }
          }
          return {}
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'details',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes), 0]
  },
  
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('details')
      const contentDOM = document.createElement('div')
      
      // 设置初始 open 状态
      if (node.attrs.open) {
        dom.setAttribute('open', '')
      }
      
      // 监听原生 toggle 事件，同步状态到 TipTap
      const handleToggle = () => {
        if (typeof getPos === 'function') {
          const pos = getPos()
          if (pos === undefined) return
          const isOpen = dom.hasAttribute('open')
          
          // 更新 TipTap 节点属性
          editor.commands.command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              open: isOpen,
            })
            return true
          })
        }
      }
      
      dom.addEventListener('toggle', handleToggle)
      
      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'details') {
            return false
          }
          
          // 同步 open 属性到 DOM
          if (updatedNode.attrs.open) {
            dom.setAttribute('open', '')
          } else {
            dom.removeAttribute('open')
          }
          
          return true
        },
        destroy: () => {
          dom.removeEventListener('toggle', handleToggle)
        },
      }
    }
  },
  
  // addCommands() {
  //   return {
  //     setDetails: () => ({ commands }) => {
  //       return commands.insertContent({
  //         type: this.name,
  //         attrs: { open: true },
  //         content: [
  //           {
  //             type: 'detailsSummary',
  //             content: [
  //               {
  //                 type: 'text',
  //                 text: '点击展开...',
  //               },
  //             ],
  //           },
  //           {
  //             type: 'detailsContent',
  //             content: [
  //               {
  //                 type: 'paragraph',
  //               },
  //             ],
  //           },
  //         ],
  //       })
  //     },
  //     toggleDetails: () => ({ commands, state }) => {
  //       const { $from } = state.selection
  //       
  //       // 查找当前是否在 details 节点中
  //       for (let d = $from.depth; d > 0; d--) {
  //         const node = $from.node(d)
  //         if (node.type.name === 'details') {
  //           const pos = $from.before(d)
  //           const currentOpen = node.attrs.open
  //           
  //           return commands.updateAttributes('details', { 
  //             open: !currentOpen 
  //           })
  //         }
  //       }
  //       
  //       return false
  //     },
  //   }
  // },
  
  // addKeyboardShortcuts() {
  //   return {
  //     'Mod-Shift-d': () => this.editor.commands.setDetails(),
  //   }
  // },
})

