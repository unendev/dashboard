"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  aiModeEnabled: boolean;
  setAiModeEnabled: (enabled: boolean) => void;
}

export const ChatInput = ({
  inputRef,
  onSubmit,
  isLoading,
  aiModeEnabled,
  setAiModeEnabled
}: ChatInputProps) => {
  return (
    <div className="p-4 border-t border-zinc-800 bg-[#0a0a0a]">
      <form onSubmit={onSubmit} className="flex gap-2 relative">
        <input 
          ref={inputRef}
          placeholder={aiModeEnabled ? "向 AI 发送指令..." : "群聊消息... (@AI 可触发 AI)"} 
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-3 pl-4 text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-600" 
          disabled={isLoading} 
        />
        {/* AI 模式切换按钮 */}
        <button 
          type="button"
          onClick={() => setAiModeEnabled(!aiModeEnabled)}
          className={cn(
            "px-3 py-2 rounded font-bold transition-all border text-xs",
            aiModeEnabled 
              ? "bg-cyan-900/80 border-cyan-600 text-cyan-100" 
              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
          )}
          title={aiModeEnabled ? "AI 模式：所有消息发给 AI" : "聊天模式：普通群聊"}
        >
          <Bot className={cn("w-4 h-4", aiModeEnabled && "text-cyan-400")} />
        </button>
        <button type="submit" disabled={isLoading} className="bg-cyan-900 hover:bg-cyan-800 text-cyan-100 px-6 py-2 rounded font-bold transition-colors border border-cyan-700 disabled:opacity-50">
          {isLoading ? '...' : 'SEND'}
        </button>
      </form>
    </div>
  );
};
