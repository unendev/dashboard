/**
 * AutoOrderListExtension - 自动处理有序列表
 * 
 * 功能：
 * 1. 当有序列表的编号不从 1 开始时，自动重置为从 1 开始
 * 2. 当两个相邻的有序列表之间没有其他内容时，自动合并为一个列表
 * 
 * 示例1（重新编号）：
 * 删除前：1. 第一项  2. 第二项  3. 第三项
 * 删除第一项后：2. 第二项  3. 第三项
 * 自动修正为：1. 第二项  2. 第三项
 * 
 * 示例2（合并列表）：
 * 合并前：
 *   1. A  2. B
 *   （空行）
 *   1. C  2. D
 * 删除空行后自动合并为：
 *   1. A  2. B  3. C  4. D
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

export const AutoOrderListExtension = Extension.create({
  name: 'autoOrderList',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoOrderList'),
        
        appendTransaction(transactions, _oldState, newState) {
          const hasDocChanged = transactions.some(tr => tr.docChanged)
          if (!hasDocChanged) {
            return null
          }

          const tr = newState.tr
          let modified = false

          // 第一步：合并相邻的有序列表
          // 从后向前遍历，避免位置偏移问题
          const listsToMerge: Array<{ firstPos: number; firstEnd: number; secondPos: number; secondNode: typeof newState.doc }> = []
          
          newState.doc.forEach((node, offset, index) => {
            if (node.type.name === 'orderedList' && index > 0) {
              // 检查前一个节点是否也是有序列表
              const prevNode = newState.doc.child(index - 1)
              if (prevNode.type.name === 'orderedList') {
                // 计算位置
                let prevOffset = 0
                for (let i = 0; i < index - 1; i++) {
                  prevOffset += newState.doc.child(i).nodeSize
                }
                listsToMerge.push({
                  firstPos: prevOffset,
                  firstEnd: prevOffset + prevNode.nodeSize,
                  secondPos: offset,
                  secondNode: node as typeof newState.doc
                })
              }
            }
          })

          // 从后向前合并，避免位置偏移
          for (let i = listsToMerge.length - 1; i >= 0; i--) {
            const { firstEnd, secondPos, secondNode } = listsToMerge[i]
            // 将第二个列表的所有 listItem 移动到第一个列表末尾
            // 删除第二个列表，将其子节点插入到第一个列表末尾
            const insertPos = firstEnd - 1 // 第一个列表的结束标签前
            
            // 收集第二个列表的所有子节点
            const items: typeof newState.doc[] = []
            secondNode.forEach(child => {
              items.push(child as typeof newState.doc)
            })
            
            // 删除第二个列表
            tr.delete(secondPos, secondPos + secondNode.nodeSize)
            
            // 在第一个列表末尾插入子节点
            items.forEach((item, idx) => {
              tr.insert(insertPos + idx, item)
            })
            
            modified = true
          }

          // 第二步：重置所有有序列表的 start 为 1
          tr.doc.descendants((node, pos) => {
            if (node.type.name === 'orderedList') {
              const currentStart = node.attrs.start
              if (currentStart && currentStart !== 1) {
                tr.setNodeMarkup(pos, null, {
                  ...node.attrs,
                  start: 1
                })
                modified = true
              }
            }
            return true
          })

          return modified ? tr : null
        }
      })
    ]
  }
})
