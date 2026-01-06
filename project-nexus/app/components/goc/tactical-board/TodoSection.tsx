"use client";

import { useState } from "react";
import { Trash2, CheckSquare, Square, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Todo } from "@/app/hooks/goc/types";

interface TodoSectionProps {
  todos: Todo[];
  todoFilter: 'shared' | 'my' | 'all';
  setTodoFilter: (f: 'shared' | 'my' | 'all') => void;
  meId?: string;
  addTodo: (text: string, options?: any) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
}

export const TodoSection = ({
  todos,
  todoFilter,
  setTodoFilter,
  meId,
  addTodo,
  toggleTodo,
  deleteTodo
}: TodoSectionProps) => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['default']));
  const [newTodoGroup, setNewTodoGroup] = useState<string>('');

  // 过滤 todos
  const filteredTodos = todos.filter((t: Todo) => {
    if (todoFilter === 'shared') return !t.ownerId;
    if (todoFilter === 'my') return t.ownerId === meId;
    return true;
  });
  
  const groups = [...new Set(filteredTodos.map((t: Todo) => t.group || 'default'))];
  
  const todosByGroup = groups.reduce((acc, group) => {
    acc[group] = {
      active: filteredTodos.filter((t: Todo) => !t.completed && (t.group || 'default') === group && !t.parentId),
      completed: filteredTodos.filter((t: Todo) => t.completed && (t.group || 'default') === group && !t.parentId),
    };
    return acc;
  }, {} as Record<string, { active: Todo[]; completed: Todo[] }>);
  
  const getSubTodos = (parentId: string) => filteredTodos.filter((t: Todo) => t.parentId === parentId);
  
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };
  
  const completedTodos = filteredTodos.filter((t: Todo) => t.completed && !t.parentId);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-1 p-2 bg-zinc-900 border-b border-zinc-800">
        <button
          onClick={() => setTodoFilter('shared')}
          className={cn(
            "px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors whitespace-nowrap",
            todoFilter === 'shared' ? "bg-[#D583F0] text-black" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
        >
          Team
        </button>
        <button
          onClick={() => setTodoFilter('my')}
          className={cn(
            "px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors whitespace-nowrap",
            todoFilter === 'my' ? "bg-cyan-600 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
        >
          My Tasks
        </button>
      </div>
      
      <div className="p-4">
        {groups.map(group => {
          const groupTodos = todosByGroup[group];
          const isExpanded = expandedGroups.has(group);
          if (groupTodos.active.length === 0 && group !== 'default') return null;
          
          return (
            <div key={group} className="mb-4">
              {group !== 'default' && (
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 hover:text-zinc-200 mb-2 w-full"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span className="font-semibold">{group}</span>
                  <span className="text-zinc-600">({groupTodos.active.length})</span>
                </button>
              )}
              
              {(group === 'default' || isExpanded) && (
                <div className="space-y-2">
                  {groupTodos.active.map((todo) => {
                    const subTodos = getSubTodos(todo.id);
                    return (
                      <div key={todo.id}>
                        <div className={cn(
                          "group flex items-start gap-3 p-3 bg-zinc-900/50 border rounded hover:border-[#D583F0]/50 transition-colors",
                          todo.ownerId ? "border-cyan-800/30" : "border-zinc-800"
                        )}>
                          <button onClick={() => toggleTodo(todo.id)} className="mt-0.5 text-zinc-500 hover:text-[#D583F0] transition-colors">
                            <Square className="w-4 h-4" />
                          </button>
                          <div className="flex-1">
                            <span className="text-sm leading-relaxed">{todo.text}</span>
                            {todo.ownerName && <span className="ml-2 text-[10px] text-cyan-500">@{todo.ownerName}</span>}
                          </div>
                          <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {subTodos.length > 0 && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-zinc-800 pl-3">
                            {subTodos.map((sub: Todo) => (
                              <div key={sub.id} className="group flex items-center gap-2 py-1 text-sm">
                                <button onClick={() => toggleTodo(sub.id)} className={sub.completed ? "text-[#D583F0]" : "text-zinc-500"}>
                                  {sub.completed ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                </button>
                                <span className={sub.completed ? "line-through text-zinc-600" : "text-zinc-300"}>{sub.text}</span>
                                <button onClick={() => deleteTodo(sub.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {groupTodos.active.length === 0 && group === 'default' && (
                    <div className="text-zinc-600 text-sm italic py-2 text-center">No active objectives.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder={todoFilter === 'my' ? "+ Add personal task" : "+ Add objective"}
            className="flex-1 bg-zinc-900 border border-dashed border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:outline-none focus:border-[#D583F0] transition-all placeholder:text-zinc-600"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTodo(e.currentTarget.value, { 
                  group: newTodoGroup || 'default',
                  isPersonal: todoFilter === 'my'
                });
                e.currentTarget.value = "";
              }
            }}
          />
          <input
            type="text"
            placeholder="Group"
            value={newTodoGroup}
            onChange={(e) => setNewTodoGroup(e.target.value)}
            className="w-20 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-400 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
          />
        </div>

        {completedTodos.length > 0 && (
          <div className="mt-6">
            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-600 hover:text-zinc-400 mb-2"
            >
              {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Completed ({completedTodos.length})
            </button>
            {showCompleted && (
              <div className="space-y-1 pl-2 border-l-2 border-zinc-800 ml-1.5">
                {completedTodos.map((todo) => (
                  <div key={todo.id} className="flex items-center gap-3 p-2 text-zinc-600 group">
                    <button onClick={() => toggleTodo(todo.id)} className="text-[#D583F0]">
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <span className="flex-1 text-sm line-through decoration-zinc-700">{todo.text}</span>
                    {todo.ownerName && <span className="text-[10px] text-cyan-600">@{todo.ownerName}</span>}
                    <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-900">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
