"use client";

import { Terminal, CheckCircle2, Loader2, FileText, Edit3, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

// 工具名称到显示信息的映射 - 每个工具有不同颜色
const toolDisplayInfo: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  getNotes: { 
    icon: <FileText className="w-3 h-3" />, 
    label: '读取笔记',
    color: 'bg-blue-950/50 text-blue-400 border-blue-500/30'
  },
  updateNote: { 
    icon: <Edit3 className="w-3 h-3" />, 
    label: '更新笔记',
    color: 'bg-amber-950/50 text-amber-400 border-amber-500/30'
  },
  addTodo: { 
    icon: <ListTodo className="w-3 h-3" />, 
    label: '添加待办',
    color: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
  },
};

// 工具调用组件 - 内联在 AI 回复中，不同工具不同颜色
export const ToolCallInline = ({ part }: { part: any }) => {
  const toolName = part.type?.replace('tool-', '') || 'unknown';
  const state = part.state || 'input-available';
  const info = toolDisplayInfo[toolName] || { 
    icon: <Terminal className="w-3 h-3" />, 
    label: toolName,
    color: 'bg-zinc-800/50 text-zinc-400 border-zinc-600/20'
  };
  const isComplete = state === 'output-available';
  const isError = state === 'output-error';
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border",
      isError ? "bg-red-950/50 text-red-400 border-red-500/30" : info.color
    )}>
      {info.icon}
      <span>{info.label}</span>
      {isComplete && <CheckCircle2 className="w-3 h-3" />}
      {isError && <span>✗</span>}
      {!isComplete && !isError && <Loader2 className="w-3 h-3 animate-spin" />}
    </span>
  );
};
