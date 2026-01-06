'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import { Minimize2 } from 'lucide-react'

// Components
import { NotesFileBar } from './NotesFileBar'
import { NotesExpandedList } from './NotesExpandedList'
import { EditorOutline } from './editor/EditorOutline'
import { EditorToolbar } from './editor/EditorToolbar'

// Hooks & Config
import { useNoteManager } from '@/app/hooks/notes/use-note-manager'
import { useOssUpload } from '@/app/hooks/useOssUpload'
import { getEditorExtensions, editorProps } from './editor-config'
import { extractHeadingsFromEditor, getEditorStyles, type HeadingItem } from '@/lib/markdown'

interface SimpleMdEditorProps {
  className?: string
  fullHeight?: boolean
}

export default function SimpleMdEditor({ className = '', fullHeight = false }: SimpleMdEditorProps) {
  // 1. Logic Hook
  const {
    notesList,
    currentNoteId, setCurrentNoteId,
    isCreatingNote,
    isSaving,
    lastSaved,
    isLoading, setIsLoading,
    userId,
    isLoadingContent,
    isSystemUpdate,
    saveTimeout,
    loadNotesList,
    loadNoteContent,
    saveContent,
    handleSelectNote,
    handleCreateNote,
    handleDeleteNote,
    handleUpdateTitle,
    handleReorderNotes,
    handleReorderChildNotes,
    grouping
  } = useNoteManager();

  // 2. Local State
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [outline, setOutline] = useState<HeadingItem[]>([])
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  
  const { upload: uploadToOss } = useOssUpload()
  const outlineTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 3. Editor Setup
  const updateOutline = useCallback((e: any) => {
    const items = extractHeadingsFromEditor(e)
    setOutline(items)
    const from = e.state.selection.from
    const current = items
      .filter((i) => i.pos <= from)
      .sort((a, b) => b.pos - a.pos)[0]
    setActiveHeadingId(current ? current.id : (items[0]?.id ?? null))
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: getEditorExtensions({
      onWikiLinkClick: (target) => {
        const matchedNote = notesList.find(n => n.title === target)
        if (matchedNote) {
          handleSelectNote(matchedNote.id, editor!)
        } else if (confirm(`笔记 "${target}" 不存在，是否创建？`)) {
          handleCreateNote(editor!, true).then(() => {
            // Need to wait for note creation and list update
            // Ideally handleCreateNote returns the new note, but current implementation updates state
            // We'll rely on optimistic updates or refetch
          })
        }
      },
      onImageUpload: async (file) => (await uploadToOss(file)).signedUrl
    }),
    editorProps: {
      ...editorProps,
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.indexOf('image') === 0) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              uploadToOss(file).then((res) => {
                const { state, dispatch } = view
                const node = state.schema.nodes.image.create({ src: res.signedUrl })
                dispatch(state.tr.replaceSelectionWith(node))
              })
            }
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (isLoadingContent.current || isSystemUpdate.current) return
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => saveContent(editor.getHTML()), 1000)
      updateOutline(editor)
    },
    onSelectionUpdate: ({ editor }) => updateOutline(editor),
    onCreate: ({ editor }) => updateOutline(editor),
  })

  // 4. Initialization
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true)
      let notes = await loadNotesList()
      if (notes.length === 0) {
        await handleCreateNote(editor!, false)
        notes = await loadNotesList()
      }
      if (notes.length > 0) {
        const lastNoteId = notes[0].id
        setCurrentNoteId(lastNoteId)
        await loadNoteContent(lastNoteId, editor!, false)
      }
      setIsLoading(false)
    }
    if (editor) initialize()
  }, [editor]) // Only run once when editor is ready

  // 5. Handlers
  const handleOutlineHover = (enter: boolean) => {
    if (outlineTimeoutRef.current) clearTimeout(outlineTimeoutRef.current)
    if (enter) setShowOutline(true)
    else outlineTimeoutRef.current = setTimeout(() => setShowOutline(false), 300)
  }

  const handleGotoHeading = (item: HeadingItem) => {
    if (!editor) return
    editor.chain().focus().setTextSelection(item.pos).run()
    editor.commands.scrollIntoView()
    setActiveHeadingId(item.id)
  }

  // Styles
  const editorStyles = getEditorStyles('dark')
  
  const renderContent = (isModal = false) => {
     if (isLoading || !editor) {
        return (
          <div className={`${className} flex items-center justify-center p-8`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-400">加载笔记中...</span>
          </div>
        )
      }

    return (
      <div className={isModal || fullHeight ? 'h-full flex flex-col' : className}>
        <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
        
        <NotesFileBar
          notes={notesList}
          currentNoteId={currentNoteId}
          onSelectNote={(id) => handleSelectNote(id, editor)}
          onCreateNote={() => handleCreateNote(editor)}
          onDeleteNote={(id) => handleDeleteNote(id, editor)}
          onUpdateNoteTitle={handleUpdateTitle}
          onReorderNotes={handleReorderNotes}
          userId={userId}
          onSelectParent={(parentId) => {
            setSelectedParentId(parentId)
            const children = grouping.getChildren(parentId)
            if (children.length > 0) handleSelectNote(children[0], editor)
          }}
          groupingData={grouping.grouping}
          onToggleExpand={(parentId, isExpanded) => setSelectedParentId(isExpanded ? parentId : null)}
        />

        {selectedParentId && (
          <NotesExpandedList
            parentNote={notesList.find(n => n.id === selectedParentId) || null}
            childNotes={grouping.getChildren(selectedParentId)
              .map((childId: string) => notesList.find(n => n.id === childId))
              .filter(Boolean) as any[]}
            activeNoteId={currentNoteId}
            onSelectNote={(id) => handleSelectNote(id, editor)}
            onCreateNote={() => handleCreateNote(editor, true, selectedParentId)}
            onDeleteNote={(id) => handleDeleteNote(id, editor)}
            onUpdateNoteTitle={handleUpdateTitle}
            isCreating={isCreatingNote}
            expandedChildId={selectedParentId}
            onToggleExpand={(childId) => grouping.toggleExpand(childId)}
            onReorderChildNotes={handleReorderChildNotes}
            onUpdateParentTitle={handleUpdateTitle}
          />
        )}

        <EditorToolbar
          lastSaved={lastSaved}
          isSaving={isSaving}
          onFullscreen={() => setIsFullscreenModalOpen(true)}
          onSave={() => editor && saveContent(editor.getHTML())}
        />

        <div className={isModal || fullHeight ? 'flex flex-1 min-h-0 relative' : 'flex relative flex-col flex-1'}>
          <div className="flex-1 min-w-0 relative flex flex-col">
            <div className="overflow-y-auto flex-1" style={{ height: isModal || fullHeight ? '100%' : 'auto' }}>
              <EditorContent editor={editor} />
            </div>
            
            <EditorOutline
              outline={outline}
              activeHeadingId={activeHeadingId}
              onGotoHeading={handleGotoHeading}
              showOutline={showOutline}
              onMouseEnter={() => handleOutlineHover(true)}
              onMouseLeave={() => handleOutlineHover(false)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {!isFullscreenModalOpen && renderContent(false)}
      {isFullscreenModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-gray-900 p-6">
            <div className="flex justify-end mb-4 flex-shrink-0">
              <button
                onClick={() => setIsFullscreenModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                title="退出全屏 (ESC)"
              >
                <Minimize2 className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {renderContent(true)}
            </div>
        </div>,
        document.body
      )}
    </>
  )
}
