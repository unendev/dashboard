import { Extension } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { ResolvedPos } from '@tiptap/pm/model'

/**
 * SwapLineExtension - 用于交换当前行与上/下行的内容
 * 
 * 快捷键：
 *   - Ctrl+ArrowUp: 当前行与上一行交换
 *   - Ctrl+ArrowDown: 当前行与下一行交换
 * 
 * 增强功能：
 *   - 支持列表项交换（包括子任务）
 *   - 子任务可以替代第一个任务位置
 *   - 智能识别块级元素类型
 */
export const SwapLineExtension = Extension.create({
  name: 'swapLine',

  addKeyboardShortcuts() {
    return {
      // Ctrl+ArrowUp: 与上一行交换
      'Ctrl-ArrowUp': ({ editor }) => {
        const { state, dispatch } = editor.view
        const { $from } = state.selection
        
        // 优先处理列表项
        const listItemInfo = findListItemInfo(state, $from)
        if (listItemInfo) {
          return swapListItems(state, dispatch, listItemInfo, 'up')
        }
        
        // 处理普通块级元素
        const currentBlockPos = findBlockElementPos(state, $from)
        if (currentBlockPos === null || currentBlockPos === 0) {
          return true
        }

        const prevBlockPos = findPrevBlockElementPos(state, currentBlockPos)
        if (prevBlockPos === null) {
          return true
        }

        swapNodes(state, dispatch, prevBlockPos, currentBlockPos)
        return true
      },
      
      // Ctrl+ArrowDown: 与下一行交换
      'Ctrl-ArrowDown': ({ editor }) => {
        const { state, dispatch } = editor.view
        const { $from } = state.selection
        
        // 优先处理列表项
        const listItemInfo = findListItemInfo(state, $from)
        if (listItemInfo) {
          return swapListItems(state, dispatch, listItemInfo, 'down')
        }
        
        // 处理普通块级元素
        const currentBlockPos = findBlockElementPos(state, $from)
        if (currentBlockPos === null) return true

        const nextBlockPos = findNextBlockElementPos(state, currentBlockPos)
        if (nextBlockPos === null) {
          return true
        }

        swapNodes(state, dispatch, currentBlockPos, nextBlockPos)
        return true
      },
    }
  },
})

// 列表项信息
interface ListItemInfo {
  listItemPos: number
  listItemNode: any
  listPos: number
  listNode: any
  indexInList: number
  totalItems: number
}

// 查找列表项信息
function findListItemInfo(state: EditorState, $from: ResolvedPos): ListItemInfo | null {
  // 从当前位置向上查找 listItem
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'listItem') {
      const listItemPos = $from.before(d)
      
      // 查找父列表
      if (d > 1) {
        const parentNode = $from.node(d - 1)
        if (parentNode.type.name === 'bulletList' || parentNode.type.name === 'orderedList') {
          const listPos = $from.before(d - 1)
          
          // 计算当前项在列表中的索引
          let indexInList = 0
          parentNode.forEach((child, offset, index) => {
            if ($from.before(d) === listPos + 1 + offset) {
              indexInList = index
            }
          })
          
          return {
            listItemPos,
            listItemNode: node,
            listPos,
            listNode: parentNode,
            indexInList,
            totalItems: parentNode.childCount,
          }
        }
      }
    }
  }
  return null
}

// 交换列表项
function swapListItems(
  state: EditorState, 
  dispatch: (tr: Transaction) => void, 
  info: ListItemInfo, 
  direction: 'up' | 'down'
): boolean {
  const { listPos, listNode, indexInList, totalItems } = info
  
  // 检查边界
  if (direction === 'up' && indexInList === 0) {
    // 已经是第一项，无法上移
    return true
  }
  if (direction === 'down' && indexInList === totalItems - 1) {
    // 已经是最后一项，无法下移
    return true
  }
  
  const targetIndex = direction === 'up' ? indexInList - 1 : indexInList + 1
  
  // 获取两个列表项的位置和节点
  let currentItemPos = 0
  let currentItemNode: any = null
  let targetItemPos = 0
  let targetItemNode: any = null
  
  let offset = 1 // 跳过列表开始标签
  listNode.forEach((child: any, childOffset: number, index: number) => {
    const itemPos = listPos + offset
    if (index === indexInList) {
      currentItemPos = itemPos
      currentItemNode = child
    }
    if (index === targetIndex) {
      targetItemPos = itemPos
      targetItemNode = child
    }
    offset += child.nodeSize
  })
  
  if (!currentItemNode || !targetItemNode) return true
  
  // 执行交换
  let tr = state.tr
  
  if (direction === 'up') {
    // 上移：先删除当前项，再在目标位置插入
    const currentSize = currentItemNode.nodeSize
    const targetSize = targetItemNode.nodeSize
    
    // 删除当前项
    tr = tr.delete(currentItemPos, currentItemPos + currentSize)
    // 在目标位置插入当前项
    tr = tr.insert(targetItemPos, currentItemNode)
    
    // 设置光标位置到移动后的项
    const newPos = targetItemPos + 1
    try {
      const $newPos = tr.doc.resolve(newPos)
      tr = tr.setSelection(state.selection.map(tr.doc, tr.mapping))
    } catch (e) {
      // 忽略选择错误
    }
  } else {
    // 下移：先删除目标项，再在当前位置后插入
    const currentSize = currentItemNode.nodeSize
    const targetSize = targetItemNode.nodeSize
    
    // 删除目标项
    tr = tr.delete(targetItemPos, targetItemPos + targetSize)
    // 在当前位置插入目标项
    tr = tr.insert(currentItemPos, targetItemNode)
    
    // 设置光标位置到移动后的项
    const newPos = currentItemPos + targetSize + 1
    try {
      const $newPos = tr.doc.resolve(newPos)
      tr = tr.setSelection(state.selection.map(tr.doc, tr.mapping))
    } catch (e) {
      // 忽略选择错误
    }
  }
  
  dispatch(tr)
  return true
}

// 查找当前块级元素位置
function findBlockElementPos(state: EditorState, $from: ResolvedPos): number | null {
  // 优先查找 listItem，然后是其他块级元素
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'listItem') {
      return $from.before(d)
    }
  }
  
  let pos = $from.before($from.depth)
  let node = state.doc.nodeAt(pos)
  
  // 如果当前节点不是块级元素，向上查找
  while (node && !node.type.isBlock && pos > 0) {
    pos--
    node = state.doc.nodeAt(pos)
  }

  return node && node.type.isBlock ? pos : null
}

// 查找上一个块级元素位置
function findPrevBlockElementPos(state: EditorState, currentPos: number): number | null {
  let pos = currentPos - 1
  while (pos >= 0) {
    const node = state.doc.nodeAt(pos)
    if (node && node.type.isBlock) {
      return pos
    }
    pos--
  }
  return null
}

// 查找下一个块级元素位置
function findNextBlockElementPos(state: EditorState, currentPos: number): number | null {
  let pos = currentPos + 1
  while (pos < state.doc.content.size) {
    const node = state.doc.nodeAt(pos)
    if (node && node.type.isBlock) {
      return pos
    }
    pos++
  }
  return null
}

// 交换两个节点
function swapNodes(state: EditorState, dispatch: (tr: Transaction) => void, pos1: number, pos2: number) {
  const node1 = state.doc.nodeAt(pos1)
  const node2 = state.doc.nodeAt(pos2)

  if (!node1 || !node2) return

  // 创建事务
  let tr = state.tr

  // 获取两个节点的大小
  const size1 = node1.nodeSize
  const size2 = node2.nodeSize

  // 删除第二个节点
  tr = tr.delete(pos2, pos2 + size2)

  // 在第一个节点处插入第二个节点
  tr = tr.insert(pos1, node2)

  // 删除原来第一个节点的位置（已经向后移动了）
  tr = tr.delete(pos1 + size2, pos1 + size2 + size1)

  dispatch(tr)
}
