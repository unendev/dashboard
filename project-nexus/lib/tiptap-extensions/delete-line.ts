import { Extension } from '@tiptap/core'

export const DeleteLineExtension = Extension.create({
  name: 'deleteLine',
  
  addKeyboardShortcuts() {
    return {
      'Mod-d': () => {
        try {
          const { state } = this.editor
          const { $from } = state.selection
          
          // 从当前位置向上查找块级节点
          // 优先查找listItem，然后是paragraph和heading
          let targetNode = null
          let targetDepth = 0
          
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d)
            
            // 优先级：listItem > heading > paragraph
            if (node.type.name === 'listItem') {
              targetNode = node
              targetDepth = d
              break // 找到listItem就停止，这是最优先的
            } else if (node.type.name === 'heading') {
              targetNode = node
              targetDepth = d
              break // 找到heading也停止
            } else if (node.type.name === 'paragraph' && !targetNode) {
              // 只有还没找到其他目标时才记录paragraph
              targetNode = node
              targetDepth = d
              // 不break，继续向上查找listItem
            }
          }
          
          // 执行删除
          if (targetNode && targetDepth > 0) {
            const pos = $from.before(targetDepth)
            const nodeSize = targetNode.nodeSize
            
            return this.editor.commands.deleteRange({ 
              from: pos, 
              to: pos + nodeSize 
            })
          }
          
          // 兜底：删除当前块内容
          const start = $from.start()
          const end = $from.end()
          if (start !== undefined && end !== undefined) {
            return this.editor.commands.deleteRange({ from: start, to: end })
          }
          
          return false
        } catch (error) {
          console.error('DeleteLineExtension error:', error)
          return false
        }
      }
    }
  }
})
