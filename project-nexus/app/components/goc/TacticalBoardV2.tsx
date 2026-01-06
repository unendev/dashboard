"use client";

/**
 * TacticalBoard V2 - 改进的三分布局
 * 左上：ToDo 列表
 * 中间：AI 主控（CommandCenter）
 * 右侧：MD 编辑区 + 大纲
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useStorage, useMutation, useSelf, useOthers } from "@liveblocks/react/suspense";
import { LiveList, LiveMap } from "@liveblocks/client";
import { Trash2, CheckSquare, Square, ChevronRight, ChevronDown, Plus, User, Users, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "@/app/components/shared/MarkdownView";
import { MarkdownOutline } from "@/app/components/shared/MarkdownOutline";

// 复用 TacticalBoard 的 Todo 类型
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  group?: string;
  parentId?: string;
  ownerId?: string;
  ownerName?: string;
}

export default function TacticalBoardV2() {
  const todos = useStorage((root) => root.todos) as Todo[] | null;
  const notes = useStorage((root) => root.notes);
  const playerNotes = useStorage((root) => root.playerNotes);
  const me = useSelf();
  const others = useOthers();

  // 状态管理
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'shared' | 'my' | string>('shared');
  const [todoFilter, setTodoFilter] = useState<'all' | 'shared' | 'my'>('shared');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['default']));
  const [newTodoGroup, setNewTodoGroup] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<null | 'shared' | 'my' | string>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [outlineOpen, setOutlineOpen] = useState(true);

  // 进入编辑模式时自动切换到"灵感"标签
  useEffect(() => {
    if (editingNoteId !== null && activeTab !== 'my') {
      setActiveTab('my');
    }
  }, [editingNoteId]);

  if (!todos || !notes || !playerNotes) {
    return <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-sm">Loading...</div>;
  }

  // 【注】这里省略了 mutations 的实现，复用原有的逻辑
  // 为了简洁，只展示布局结构

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 font-mono">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-lg font-bold text-[#D583F0] tracking-wider">TACTICAL BOARD V2</h2>
      </div>

      {/* 三分布局 */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        
        {/* ===== 左上：ToDo 列表 ===== */}
        <div className="w-1/4 flex flex-col border border-zinc-800 rounded bg-zinc-950/50 overflow-hidden">
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/50">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Tasks</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {/* ToDo 列表内容 */}
            <div className="text-xs text-zinc-500">
              <p>📋 ToDo 列表</p>
              <p className="mt-1 text-zinc-600">（复用原有逻辑）</p>
            </div>
          </div>
        </div>

        {/* ===== 中间：AI 主控 ===== */}
        <div className="w-1/2 flex flex-col border border-zinc-800 rounded bg-zinc-950/50 overflow-hidden">
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/50">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">AI Command Center</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {/* AI 主控内容 */}
            <div className="text-xs text-zinc-500">
              <p>🤖 AI 主控</p>
              <p className="mt-1 text-zinc-600">参考 CommandCenter 实现</p>
              <p className="mt-2 text-cyan-600">• 对话历史</p>
              <p className="text-cyan-600">• 工具调用</p>
              <p className="text-cyan-600">• 实时交互</p>
            </div>
          </div>
        </div>

        {/* ===== 右侧：MD 编辑区 + 大纲 ===== */}
        <div className="w-1/4 flex flex-col border border-zinc-800 rounded bg-zinc-950/50 overflow-hidden">
          {/* 标签栏 */}
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Notes</h3>
            <button
              onClick={() => setOutlineOpen(!outlineOpen)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="切换大纲"
            >
              {outlineOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 大纲面板 */}
            {outlineOpen && (
              <div className="w-1/3 border-r border-zinc-800 bg-zinc-900/30 overflow-y-auto custom-scrollbar">
                <MarkdownOutline 
                  content={notes || ''}
                  className="text-xs"
                />
              </div>
            )}

            {/* MD 编辑/预览区 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              <MarkdownView content={notes || ''} variant="goc" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
