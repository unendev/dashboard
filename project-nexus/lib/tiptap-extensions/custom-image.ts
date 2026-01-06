import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {}
          }
          return { width: attributes.width }
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {}
          }
          return { height: attributes.height }
        },
      },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const container = document.createElement('div')
      container.className = 'image-resizer'
      container.contentEditable = 'false'
      
      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.className = 'tiptap-image'
      
      if (node.attrs.width) {
        img.style.width = node.attrs.width + 'px'
      }
      
      img.addEventListener('dblclick', () => {
        img.style.width = ''
        if (typeof getPos === 'function') {
          editor.commands.updateAttributes('image', { width: null, height: null })
        }
      })
      
      // 检测是否为移动设备
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth < 768
      
      // 仅在桌面端添加拖拽调整手柄
      if (!isMobile) {
        const resizeHandle = document.createElement('div')
        resizeHandle.className = 'image-resize-handle'
        
        let isResizing = false
        let startX = 0
        let startWidth = 0
        
        resizeHandle.addEventListener('mousedown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          isResizing = true
          startX = e.clientX
          startWidth = img.offsetWidth
          
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
          
          container.classList.add('resizing')
        })
        
        const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing) return
          
          const diff = e.clientX - startX
          const newWidth = Math.max(100, startWidth + diff)
          img.style.width = newWidth + 'px'
        }
        
        const handleMouseUp = () => {
          if (!isResizing) return
          isResizing = false
          
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
          
          container.classList.remove('resizing')
          
          if (typeof getPos === 'function') {
            const width = img.offsetWidth
            const height = img.offsetHeight
            editor.commands.updateAttributes('image', { width, height })
          }
        }
        
        container.appendChild(img)
        container.appendChild(resizeHandle)
      } else {
        // 移动端：只添加图片，不添加调整手柄
        container.appendChild(img)
      }
      
      return {
        dom: container,
        contentDOM: null,
        ignoreMutation: () => true,
      }
    }
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        draggable: 'false',
        contenteditable: 'false',
      }),
    ]
  },
})
