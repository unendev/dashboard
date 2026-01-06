import { useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useNoteGrouping } from '@/app/components/features/notes/hooks/useNoteGrouping';
import { useNoteCache } from '@/app/components/features/notes/hooks/useNoteCache';
import { Editor } from '@tiptap/react';

export interface Note {
  id: string;
  title: string;
  content?: string;
  order: number;
}

export function useNoteManager() {
  const { data: session } = useSession();
  const userId = session?.user?.id || 'user-1';

  const grouping = useNoteGrouping(userId);
  const noteCache = useNoteCache(userId);

  const [notesList, setNotesList] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialContent, setInitialContent] = useState<string>('');

  // Refs for logic that doesn't trigger re-renders or needs immediate access
  const isLoadingContent = useRef(false);
  const isSystemUpdate = useRef(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load list
  const loadNotesList = useCallback(async () => {
    try {
      // LocalStorage implementation (Re-applied)
      const savedNotes = localStorage.getItem(`notes_${userId}`);
      let notes: Note[] = savedNotes ? JSON.parse(savedNotes) : [];
      setNotesList(notes);
      return notes;
    } catch (error) {
      console.error('Error loading notes list:', error);
      return [];
    }
  }, [userId]);

  // Save content
  const saveContent = useCallback(async (content: string, noteId?: string) => {
    const targetId = noteId || currentNoteId;
    if (!targetId) return;

    setIsSaving(true);
    try {
      // await fetch(`/api/notes/${targetId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ content }),
      // });
      // LocalStorage Save Content (Re-applied)
      const key = `note_content_${targetId}`;
      localStorage.setItem(key, content);

      setLastSaved(new Date());
      setInitialContent(content);
      noteCache.setCached(targetId, content);

    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentNoteId, noteCache, userId]);

  // Load content
  const loadNoteContent = useCallback(async (noteId: string, editor: Editor, useCache = true) => {
    if (!editor) return;

    isLoadingContent.current = true;
    try {
      // LocalStorage Load (Re-applied)
      const key = `note_content_${noteId}`;
      const content = localStorage.getItem(key) || '';

      isSystemUpdate.current = true;
      editor.commands.setContent(content);
      setInitialContent(content);
      isSystemUpdate.current = false;

      noteCache.setCached(noteId, content);
    } catch (error) {
      console.error(`Error loading note ${noteId}:`, error);
    } finally {
      setTimeout(() => { isLoadingContent.current = false; }, 100);
    }
  }, [noteCache, currentNoteId]);

  // Helpers
  const clearPendingSave = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
  };

  const saveIfDirty = async (editor: Editor) => {
    if (editor && editor.getHTML() !== initialContent) {
      await saveContent(editor.getHTML());
    }
  };

  // Actions
  const handleSelectNote = async (noteId: string, editor: Editor) => {
    if (noteId === currentNoteId) return;
    clearPendingSave();
    await saveIfDirty(editor);
    setCurrentNoteId(noteId);
    await loadNoteContent(noteId, editor);
  };

  const handleCreateNote = async (editor: Editor, selectNewNote = true, parentId?: string) => {
    clearPendingSave();
    await saveIfDirty(editor);

    setIsCreatingNote(true);
    try {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: `新建笔记 ${new Date().toLocaleDateString()}`,
        order: notesList.length,
        content: ''
      };

      if (parentId) {
        grouping.addToGroup(parentId, newNote.id);
      }

      const updatedList = [...notesList, newNote];
      setNotesList(updatedList);
      localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedList));

      if (selectNewNote) {
        setCurrentNoteId(newNote.id);
        isSystemUpdate.current = true;
        editor?.commands.setContent('');
        setInitialContent('');
        isSystemUpdate.current = false;
      }
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string, editor: Editor) => {
    try {
      const updatedList = notesList.filter(n => n.id !== noteId);
      setNotesList(updatedList);
      localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedList));
      localStorage.removeItem(`note_content_${noteId}`); // Clean up content

      noteCache.invalidateCache(noteId);

      // Refresh list logic from local state
      const remainingNotes = updatedList;

      if (remainingNotes.length > 0) {
        if (noteId === currentNoteId) {
          const newCurrentId = remainingNotes[0].id;
          setCurrentNoteId(newCurrentId);
          loadNoteContent(newCurrentId, editor);
        }
      } else {
        await handleCreateNote(editor);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleUpdateTitle = async (noteId: string, newTitle: string) => {
    const originalNotes = notesList;
    const updatedList = notesList.map(n => n.id === noteId ? { ...n, title: newTitle } : n);
    setNotesList(updatedList);
    localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedList));

    try {
      // Fetch removed
    } catch (error) {
      console.error('Error updating title:', error);
      setNotesList(originalNotes);
    }
  };

  const handleReorderNotes = async (reorderedNotes: Note[]) => {
    const originalNotes = [...notesList];
    const reorderedMap = new Map(reorderedNotes.map(n => [n.id, n]));

    const newNotesList = originalNotes
      .map(note => reorderedMap.get(note.id) || note)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    setNotesList(newNotesList);
    localStorage.setItem(`notes_${userId}`, JSON.stringify(newNotesList));
  };

  const handleReorderChildNotes = async (parentId: string, reorderedChildNotes: Note[]) => {
    const originalNotes = [...notesList];
    const reorderedMap = new Map(reorderedChildNotes.map(n => [n.id, n]));

    const updatedNotesList = originalNotes.map(note => {
      const reorderedChildNote = reorderedMap.get(note.id);
      return reorderedChildNote ? { ...note, order: reorderedChildNote.order } : note;
    });
    setNotesList(updatedNotesList);
    localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedNotesList));

    grouping.updateGroup(parentId, reorderedChildNotes.map(n => n.id));

    try {
      // Fetch removed
    } catch (error) {
      console.error('Error reordering child notes:', error);
      setNotesList(originalNotes);
      grouping.updateGroup(parentId, originalNotes.filter(n => grouping.getGroup(parentId)?.includes(n.id)).map(n => n.id));
    }
  };

  return {
    // State
    notesList,
    currentNoteId, setCurrentNoteId,
    isCreatingNote,
    isSaving,
    lastSaved,
    isLoading, setIsLoading,
    userId,

    // Refs
    isLoadingContent,
    isSystemUpdate,
    saveTimeout,

    // Methods
    loadNotesList,
    loadNoteContent,
    saveContent,
    handleSelectNote,
    handleCreateNote,
    handleDeleteNote,
    handleUpdateTitle,
    handleReorderNotes,
    handleReorderChildNotes,

    // Grouping
    grouping
  };
}
