import { Node, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

/**
 * DetailsSummary 扩展 - 折叠块标题
 * 
 * 作为 Details 的子节点，显示可点击的标题区域
 * 只允许纯文本内容，不支持复杂格式
 */
export const DetailsSummary = Node.create({
  name: 'detailsSummary',
  
  content: 'text*',
  
  defining: true,
  
  selectable: true,
  
  parseHTML() {
    return [
      {
        tag: 'summary',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes), 0]
  },
  
  addKeyboardShortcuts() {
    return {
      // 在 summary 中按 Enter，跳转到 content
      'Enter': () => {
        const { state, view } = this.editor
        const { $from } = state.selection
        
        // 检查当前是否在 detailsSummary 中
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d)
          if (node.type.name === 'detailsSummary') {
            // 找到 detailsSummary 的下一个节点（应该是 detailsContent）
            const detailsDepth = d - 1
            const detailsNode = $from.node(detailsDepth)
            
            if (detailsNode.type.name === 'details') {
              // 计算 detailsContent 的位置
              const summaryNode = $from.node(d)
              const summaryPos = $from.before(d)
              const contentPos = summaryPos + summaryNode.nodeSize
              
              // 设置光标到 content 的开始位置
              const tr = state.tr.setSelection(
                TextSelection.near(
                  state.doc.resolve(contentPos + 1)
                )
              )
              view.dispatch(tr)
              return true
            }
          }
        }
        
        return false
      },
      
      // 在 summary 开头按 Backspace，删除整个 details
      'Backspace': () => {
        const { state } = this.editor
        const { $from, empty } = state.selection
        
        if (!empty || $from.parentOffset !== 0) {
          return false
        }
        
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d)
          if (node.type.name === 'detailsSummary') {
            // 检查 summary 是否为空
            if (node.textContent.length === 0) {
              const detailsDepth = d - 1
              const detailsNode = $from.node(detailsDepth)
              
              if (detailsNode.type.name === 'details') {
                const pos = $from.before(detailsDepth)
                const nodeSize = detailsNode.nodeSize
                
                return this.editor.commands.deleteRange({
                  from: pos,
                  to: pos + nodeSize,
                })
              }
            }
          }
        }
        
        return false
      },
    }
  },
})

