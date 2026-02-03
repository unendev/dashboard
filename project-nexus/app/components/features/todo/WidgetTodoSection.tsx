'use client'

import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { ChevronDown, ChevronRight, Square, CheckSquare, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/app/components/ui/input';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function WidgetTodoSection({ className = '' }: { className?: string }) {
  const { data: items = [], isLoading } = useSWR('/api/widget/todo', fetcher);
  const [inputValue, setInputValue] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["default"]));
  const [showCompleted, setShowCompleted] = useState(false);

  const groups = useMemo(() => Array.from(new Set(items.map((t: any) => t.group || 'default'))), [items]);
  const activeTodos = items.filter((t: any) => !t.completed);
  const completedTodos = items.filter((t: any) => t.completed);

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    const group = newGroup.trim() || "default";
    const text = inputValue.trim();
    setInputValue("");
    await fetch('/api/widget/todo', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, group }),
    });
    mutate('/api/widget/todo');
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    await fetch('/api/widget/todo', {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: !completed }),
    });
    mutate('/api/widget/todo');
  };

  const deleteTodo = async (id: string) => {
    await fetch(`/api/widget/todo?id=${id}`, { method: "DELETE" });
    mutate('/api/widget/todo');
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900/40 backdrop-blur-sm ${className}`}>
      <div className="flex items-center px-4 py-3 border-b border-gray-700/50">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">✅ 待办事项 {isLoading && <Loader2 size={12} className="animate-spin" />}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTodos.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-6">没有正在进行的任务</div>
        )}
        {groups.map((group: any) => {
          const groupTodos = activeTodos.filter((t: any) => (t.group || 'default') === group);
          if (groupTodos.length === 0) return null;
          return (
            <div key={group}>
              <button
                onClick={() => setExpandedGroups(prev => {
                  const n = new Set(prev);
                  if (n.has(group)) n.delete(group);
                  else n.add(group);
                  return n;
                })}
                className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5"
              >
                {expandedGroups.has(group) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{group === 'default' ? '默认' : group}</span>
              </button>
              {expandedGroups.has(group) && groupTodos.map((t: any) => (
                <div key={t.id} className="group flex items-start gap-2 p-2 bg-gray-800/40 rounded">
                  <button onClick={() => toggleTodo(t.id, t.completed)} className="text-gray-400 hover:text-emerald-400">
                    <Square size={16} />
                  </button>
                  <span className="text-sm text-gray-200 flex-1">{t.text}</span>
                  <button
                    onClick={() => deleteTodo(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {completedTodos.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              className="flex items-center gap-1.5 text-xs text-gray-500 mb-2"
            >
              {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              已完成（{completedTodos.length}）
            </button>
            {showCompleted && (
              <div className="space-y-2">
                {completedTodos.map((t: any) => (
                  <div key={t.id} className="group flex items-start gap-2 p-2 bg-gray-900/40 rounded">
                    <button onClick={() => toggleTodo(t.id, t.completed)} className="text-emerald-400">
                      <CheckSquare size={16} />
                    </button>
                    <span className="text-sm text-gray-500 line-through flex-1">{t.text}</span>
                    <button
                      onClick={() => deleteTodo(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-700/50 flex gap-2">
        <Input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="+ 添加待办..." className="h-9 text-sm" />
        <Input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="分组" className="w-20 h-9 text-xs" />
      </div>
    </div>
  );
}
