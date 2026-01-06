import { Node, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

/**
 * DetailsContent 扩展 - 折叠块内容区域
 * 
 * 作为 Details 的子节点，包含可折叠的内容
 * 支持所有 block 级别内容（段落、标题、列表、代码块等）
 * 支持嵌套其他 details 折叠块
 */
export const DetailsContent = Node.create({
  name: 'detailsContent',
  
  content: 'block+',
  
  defining: true,
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="details-content"]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'details-content',
        class: 'details-content',
      }),
      0,
    ]
  },
  
  addKeyboardShortcuts() {
    return {
      // 在 content 末尾按两次 Enter，退出 details 块
      'Enter': () => {
        const { state, view } = this.editor
        const { $from, empty } = state.selection
        
        if (!empty) {
          return false
        }
        
        // 检查当前是否在 detailsContent 中
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d)
          if (node.type.name === 'detailsContent') {
            // 检查是否在空段落中
            const parentNode = $from.node(d - 1)
            if (parentNode.type.name === 'paragraph' && parentNode.textContent.length === 0) {
              // 查找 details 节点
              const detailsDepth = d - 1
              const detailsNode = $from.node(detailsDepth)
              
              if (detailsNode.type.name === 'details') {
                // 删除空段落并在 details 后插入新段落
                const detailsPos = $from.before(detailsDepth)
                const detailsSize = detailsNode.nodeSize
                const emptyParaPos = $from.before(d - 1)
                const emptyParaSize = parentNode.nodeSize
                
                const tr = state.tr
                  .delete(emptyParaPos, emptyParaPos + emptyParaSize)
                  .insert(
                    detailsPos + detailsSize - emptyParaSize,
                    state.schema.nodes.paragraph.create()
                  )
                
                view.dispatch(tr)
                
                // 设置光标到新段落
                const newPos = detailsPos + detailsSize - emptyParaSize + 1
                const newTr = view.state.tr.setSelection(
                  TextSelection.near(
                    view.state.doc.resolve(newPos)
                  )
                )
                view.dispatch(newTr)
                
                return true
              }
            }
          }
        }
        
        return false
      },
    }
  },
})

