'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import { Minimize2, Maximize2, Loader2, Save } from 'lucide-react'
import { useSession } from 'next-auth/react'

// Components
import { EditorToolbar } from './editor/EditorToolbar'

// Hooks & Config
import { useOssUpload } from '@/app/hooks/useOssUpload'
import { getEditorExtensions, editorProps } from './editor-config'
import { getEditorStyles } from '@/lib/markdown'

interface WidgetMemoEditorProps {
  className?: string
  fullHeight?: boolean
}

const API_ENDPOINT = '/api/widget/memo';

export default function WidgetMemoEditor({ className = '', fullHeight = false }: WidgetMemoEditorProps) {
  // 1. State
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { upload: uploadToOss } = useOssUpload();

  // 2. Load Content
  useEffect(() => {
    const loadContent = async () => {
      if (!session?.user) return;
      try {
        setIsLoading(true);
        const res = await fetch(API_ENDPOINT);
        if (res.ok) {
          const data = await res.json();
          if (data && data.content) {
            setContent(data.content);
            // Wait for editor to be ready before setting content
            if (editor && !editor.isDestroyed) {
                editor.commands.setContent(data.content);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load memo:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [session]);

  // 3. Save Logic
  const saveContent = useCallback(async (newContent: string) => {
    if (!session?.user) return;
    setIsSaving(true);
    try {
      await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save memo:', error);
    } finally {
      setIsSaving(false);
    }
  }, [session]);

  // 4. Editor Setup
  const editor = useEditor({
    immediatelyRender: false,
    extensions: getEditorExtensions({
      onWikiLinkClick: (target) => {
        console.log('Wiki link clicked:', target);
        // Future: Implement jump logic if needed, currently no-op for single file
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
      const html = editor.getHTML();
      setContent(html);
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveContent(html), 1000);
    },
  });

  // Set initial content when editor is ready and content is loaded
  useEffect(() => {
    if (editor && content && editor.isEmpty) {
       // Only set content if editor is empty to avoid overwriting user input during race conditions
       // But 'content' state is initial load, so this is safe for first render
       // Wait, onUpdate updates 'content', so this check is tricky. 
       // Better rely on the initial load effect to set content if editor exists, 
       // or here if content exists but editor was just created.
       // Actually, simplified: create editor with content if possible, or setContent later.
       // We initialized useEditor with default content? No.
       // Let's just use commands.setContent in the load effect.
    }
  }, [editor]);
  
  // Re-run setContent when content loads if editor wasn't ready then
  useEffect(() => {
      if (editor && !editor.isDestroyed && content && editor.getText() === '' && !isLoading) {
          editor.commands.setContent(content);
      }
  }, [editor, content, isLoading]);


  // Styles
  const editorStyles = getEditorStyles('dark');

  const renderContent = (isModal = false) => {
    if (isLoading && !editor) {
      return (
        <div className={`${className} flex items-center justify-center p-8 h-full`}>
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          <span className="ml-2 text-gray-400">加载笔记中...</span>
        </div>
      );
    }

    return (
      <div className={isModal || fullHeight ? 'h-full flex flex-col' : className}>
        <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
        
        {/* Simplified Toolbar - No File List */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50 bg-gray-800/30">
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="font-medium text-gray-200">Widget Memo</span>
                {isSaving && <span className="flex items-center gap-1 text-xs text-blue-400"><Loader2 size={10} className="animate-spin"/> 保存中...</span>}
                {!isSaving && lastSaved && <span className="text-xs text-gray-500">已保存 {lastSaved.toLocaleTimeString()}</span>}
            </div>
            <div className="flex items-center gap-1">
                 <button
                    onClick={() => setIsFullscreenModalOpen(true)}
                    className="p-1.5 hover:bg-gray-700/50 rounded-md text-gray-400 hover:text-white transition-colors"
                    title="全屏"
                 >
                    <Maximize2 size={16} />
                 </button>
            </div>
        </div>

        <EditorToolbar
          lastSaved={lastSaved}
          isSaving={isSaving}
          onFullscreen={() => setIsFullscreenModalOpen(true)}
          onSave={() => editor && saveContent(editor.getHTML())}
        />

        <div className="flex-1 min-h-0 relative flex flex-col">
            <div className="overflow-y-auto flex-1 p-4" style={{ height: isModal || fullHeight ? '100%' : 'auto' }}>
              <EditorContent editor={editor} />
            </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {!isFullscreenModalOpen && renderContent(false)}
      {isFullscreenModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-gray-900 p-6 flex flex-col">
            <div className="flex justify-end mb-4 flex-shrink-0">
              <button
                onClick={() => setIsFullscreenModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                title="退出全屏 (ESC)"
              >
                <Minimize2 className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
              </button>
            </div>
            <div className="flex-1 min-h-0 border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
              {renderContent(true)}
            </div>
        </div>,
        document.body
      )}
    </>
  );
}
