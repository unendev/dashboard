'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Extension } from '@tiptap/core'
import { CustomImage } from '@/lib/tiptap-extensions/custom-image'
import { DeleteLineExtension } from '@/lib/tiptap-extensions/delete-line'
import { SwapLineExtension } from '@/lib/swap-line-extension'
import { AutoOrderListExtension } from '@/lib/tiptap-extensions/auto-order-list'
import { Details } from '@/lib/tiptap-extensions/details'
import { DetailsSummary } from '@/lib/tiptap-extensions/details-summary'
import { DetailsContent } from '@/lib/tiptap-extensions/details-content'
import { WikiLink, createWikiLinkInputRule } from '@/lib/tiptap-extensions/wiki-link'
import { useEffect, useRef } from 'react'
import { useOssUpload } from '@/app/hooks/useOssUpload'

import type { Editor } from '@tiptap/core'

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  onLinkClick?: (target: string) => void
  onOutlineUpdate?: (editor: Editor) => void
  onEditorReady?: (editor: Editor) => void
  className?: string
  placeholder?: string
}

export function TiptapEditor({
  content,
  onChange,
  onLinkClick,
  onOutlineUpdate,
  onEditorReady,
  className = '',
  placeholder = '开始写笔记...'
}: TiptapEditorProps) {
  const { upload: uploadToOss } = useOssUpload()
  const isUpdatingContent = useRef(false)

  const editor = useEditor({
    immediatelyRender: false,
    content,
    extensions: [
      StarterKit.configure({ 
        heading: { levels: [1, 2, 3] },
        bold: { HTMLAttributes: { class: 'font-bold' } },
        italic: { HTMLAttributes: { class: 'italic' } },
      }),
      Placeholder.configure({ placeholder }),
      Typography,
      CustomImage.configure({ allowBase64: true, HTMLAttributes: { class: 'tiptap-image' } }),
      DeleteLineExtension,
      SwapLineExtension,
      AutoOrderListExtension,
      Details,
      DetailsSummary,
      DetailsContent,
      WikiLink.configure({
        onLinkClick: (target: string) => onLinkClick?.(target),
      }),
      Extension.create({
        name: 'wikiLinkInputRule',
        addInputRules() {
          return [createWikiLinkInputRule()]
        },
      }),
    ],
    editorProps: {
        attributes: {
          class: `prose prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3 ${className}`,
        },
        handlePaste: (view, event) => {
            const items = event.clipboardData?.items
            if (!items) return false
    
            for (let i = 0; i < items.length; i++) {
              const item = items[i]
              if (item.type.indexOf('image') === 0) {
                event.preventDefault()
                const file = item.getAsFile()
                if (file) {
                  uploadToOss(file).then((url) => {
                    const { state, dispatch } = view
                    const node = state.schema.nodes.image.create({ src: url })
                    const transaction = state.tr.replaceSelectionWith(node)
                    dispatch(transaction)
                  }).catch((error) => {
                    console.error('❌ 图片上传失败:', error)
                  })
                }
                return true
              }
            }
            return false
          },
    },
    onUpdate: ({ editor }) => {
      // Avoid infinite loop if update comes from parent
      if (!isUpdatingContent.current) {
        onChange(editor.getHTML())
      }
      onOutlineUpdate?.(editor)
    },
    onSelectionUpdate: ({ editor }) => {
      onOutlineUpdate?.(editor)
    },
    onCreate: ({ editor }) => {
      onOutlineUpdate?.(editor)
      onEditorReady?.(editor)
    },
  })

  // Sync content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isUpdatingContent.current = true
      // Only set content if it's significantly different to avoid cursor jumps?
      // Tiptap handles this well usually, but precise cursor position might be lost.
      // Ideally we only set content if it's a "new load".
      // But for now, simple sync.
      
      // Check if content is actually different to avoid cursor jumping on every keystroke if parent updates back
      // Since parent update comes from onChange, we assume parent matches editor state unless external change (load).
      // We can use a ref to track if the change originated from us.
      
      // Simple logic: If we are not editing, update.
      // But we are always editing.
      // Better logic: Only update if content changed externally (e.g. note switch).
      // The parent component should handle "Note Switch" by mounting a new Editor or resetting content.
      // Here we blindly set content. The parent needs to be careful not to pass back the same content immediately?
      // Actually, if parent passes back the same content (string equality), React useEffect won't run.
      // So this is safe.
      editor.commands.setContent(content)
      isUpdatingContent.current = false
    }
  }, [content, editor])

  return (
    <>
      <style jsx global>{`
        /* TipTap Styles */
        .ProseMirror { outline: none; padding: 1rem; color: #e5e7eb; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
        .ProseMirror li { margin: 0.25rem 0; padding-left: 0.25rem; color: #d1d5db; }
        .ProseMirror strong { font-weight: 700; color: #f3f4f6; }
        .ProseMirror em { font-style: italic; color: #e5e7eb; }
        .ProseMirror h1 { font-size: 2rem; font-weight: 700; margin: 1.5rem 0 1rem; color: #f9fafb; line-height: 1.2; }
        .ProseMirror h2 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.75rem; color: #f3f4f6; line-height: 1.3; }
        .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; color: #e5e7eb; line-height: 1.4; }
        .ProseMirror p { margin: 0.75rem 0; line-height: 1.6; color: #d1d5db; }
        .ProseMirror code { background-color: #374151; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875rem; color: #fbbf24; }
        .ProseMirror pre { background-color: #1f2937; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
        .ProseMirror pre code { background-color: transparent; padding: 0; color: #e5e7eb; }
        .ProseMirror blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1rem 0; color: #9ca3af; font-style: italic; }
        .ProseMirror a { color: #60a5fa; text-decoration: underline; cursor: pointer; }
        .ProseMirror details { border: 1px solid #4b5563; border-radius: 0.5rem; padding: 0; margin: 1rem 0; background-color: #1f2937; }
        .ProseMirror summary { padding: 0.75rem 1rem; cursor: pointer; font-weight: 500; color: #e5e7eb; background-color: #374151; }
        .ProseMirror .details-content { padding: 1rem; color: #d1d5db; }
        .tiptap-image { max-width: 100%; height: auto; display: block; border-radius: 4px; }
      `}</style>
      <EditorContent editor={editor} />
    </>
  )
}
