"use client";

import { useState, useCallback } from "react";
import { useStorage, useMutation, useSelf, useOthers } from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import { Todo, PlayerNote } from "./types";

export function useTacticalBoard() {
  const todos = useStorage((root) => root.todos) as Todo[] | null;
  const notes = useStorage((root) => root.notes) as string;
  const playerNotes = useStorage((root) => root.playerNotes);
  const me = useSelf();
  const others = useOthers();

  const [activeTab, setActiveTab] = useState<'shared' | 'my' | string>('shared');
  const [todoFilter, setTodoFilter] = useState<'all' | 'shared' | 'my'>('shared');

  // --- Todo Mutations ---
  const addTodo = useMutation(({ storage, self }, text: string, options?: { group?: string; parentId?: string; isPersonal?: boolean }) => {
    if (!text.trim()) return;
    const todos = storage.get("todos");
    const newTodo: Todo = { 
      id: crypto.randomUUID(), 
      text, 
      completed: false,
      group: options?.group || 'default',
      parentId: options?.parentId || undefined,
      ownerId: options?.isPersonal ? self?.id : undefined,
      ownerName: options?.isPersonal ? (self?.info?.name || 'Unknown') : undefined,
    };
    if (todos) {
      (todos as any).push(newTodo);
    } else {
      storage.set("todos", new LiveList<any>([newTodo]) as any);
    }
  }, []);

  const toggleTodo = useMutation(({ storage }, id: string) => {
    const todos = storage.get("todos") as any;
    const index = todos.findIndex((todo: any) => todo.id === id);
    if (index !== -1) {
      const todo = todos.get(index);
      if (todo) {
        todos.set(index, { ...todo, completed: !todo.completed });
      }
    }
  }, []);

  const deleteTodo = useMutation(({ storage }, id: string) => {
    const todos = storage.get("todos") as any;
    const toDelete: number[] = [];
    todos.forEach((todo: any, index: number) => {
      if (todo.id === id || todo.parentId === id) {
        toDelete.push(index);
      }
    });
    toDelete.reverse().forEach((index: number) => todos.delete(index));
  }, []);

  // --- Notes Mutations ---
  const updateSharedNotes = useMutation(({ storage }, newNotes: string) => {
    storage.set("notes", newNotes);
  }, []);

  const updateMyNotes = useMutation(({ storage, self }, newNotes: string) => {
    const pNotes = storage.get("playerNotes");
    if (pNotes && self?.id) {
       pNotes.set(self.id, { 
         content: newNotes, 
         name: self.info?.name || "Unknown" 
       });
    }
  }, []);

  const getNoteData = useCallback((userId: string) => {
    const raw = playerNotes?.get(userId);
    if (!raw) return { content: "", name: null };
    if (typeof raw === 'string') return { content: raw, name: null };
    return raw as PlayerNote;
  }, [playerNotes]);

  const getTabContent = useCallback(() => {
    if (activeTab === 'shared') return notes;
    if (activeTab === 'my') {
      if (!me?.id) return "";
      return getNoteData(me.id).content;
    }
    return getNoteData(activeTab).content;
  }, [activeTab, notes, getNoteData, me?.id]);

  return {
    // Data
    todos,
    notes,
    playerNotes,
    me,
    others,
    
    // UI State
    activeTab, setActiveTab,
    todoFilter, setTodoFilter,
    
    // Actions
    addTodo,
    toggleTodo,
    deleteTodo,
    updateSharedNotes,
    updateMyNotes,
    getNoteData,
    getTabContent,
  };
}
