"use client";

import { useRef, useEffect } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "@/app/components/shared/MarkdownView";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCallInline } from "./ToolCallInline";

interface MessageListProps {
  messages: any[];
  status: string;
  me: any;
  others: readonly any[];
  getUIMessageContent: (msg: any) => string;
}

export const MessageList = ({
  messages,
  status,
  me,
  others,
  getUIMessageContent
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  
  // 智能滚动逻辑
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // 增加一个阈值，比如 50px，避免过于敏感
      isNearBottom.current = scrollHeight - scrollTop - clientHeight < 150;
    }
  };
  
  // 仅当消息列表末尾项变化时，且用户在底部时，才触发滚动
  useEffect(() => {
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages[messages.length - 1]?.content, messages[messages.length - 1]?.parts?.length]); // 依赖最后一条消息的内容或parts长度

  // Helpers
  const isMyOwnMessage = (m: any) => {
    if (m.role !== 'user') return false;
    return !m.userName || m.userName === me?.info?.name;
  };

  const getDisplayName = (m: any) => {
    if (m.role === 'user') return m.userName || me?.info?.name || "Operator";
    return "NEXUS AI";
  };

  const getUserAvatar = (m: any): string | null => {
    if (m.role !== 'user') return null;
    const userName = m.userName || me?.info?.name;
    if (userName === me?.info?.name) {
      return (me?.info as any)?.picture || (me?.info as any)?.avatar || null;
    }
    const other = others.find(o => o.info?.name === userName);
    return (other?.info as any)?.picture || (other?.info as any)?.avatar || null;
  };

  return (
    <div 
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 pt-32 space-y-4 custom-scrollbar"
    >
      {messages.map((m: any) => {
        if (m.role === 'system' || m.role === 'tool') return null;
        
        const isAI = m.role === 'assistant';
        const isMine = isMyOwnMessage(m);
        const content = getUIMessageContent(m);
        const avatar = getUserAvatar(m);
        const displayName = getDisplayName(m);

        // AI 消息居中显示
        if (isAI) {
          const toolCallsFromSync = m.toolCalls || [];
          
          return (
            <div key={m.id} className="flex flex-col items-center">
              {/* AI Header */}
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 opacity-70">
                  {displayName}
                </span>
              </div>
              {/* AI Bubble */}
              <div className="relative max-w-[90%] p-4 rounded-xl text-sm border shadow-lg backdrop-blur-sm bg-black/40 border-cyan-500/30 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                {m.parts ? (
                  // 本地消息：按 parts 顺序渲染
                  <div className="space-y-2">
                    {(() => {
                      let accumulatedReasoning = '';
                      let reasoningState: 'streaming' | 'done' | undefined;
                      const renderedParts: React.ReactNode[] = [];
                      
                      m.parts.forEach((part: any, idx: number) => {
                        if (part.type === 'text' && part.text) {
                          renderedParts.push(
                            <div key={`text-${idx}`} className="markdown-content">
                              <MarkdownView content={part.text} variant="goc" />
                            </div>
                          );
                        } else if (part.type === 'reasoning') {
                          const reasoningText = part.text || '';
                          if (reasoningText) {
                            accumulatedReasoning += reasoningText;
                          }
                          if (part.state) {
                            reasoningState = part.state;
                          }
                        } else if (part.type?.startsWith('tool-')) {
                          renderedParts.push(
                            <div key={part.toolCallId || `tool-${idx}`} className="my-1">
                              <ToolCallInline part={part} />
                            </div>
                          );
                        }
                      });
                      
                      if (accumulatedReasoning) {
                        const isReasoningStreaming = reasoningState === 'streaming' || status === 'streaming';
                        renderedParts.unshift(
                          <ReasoningBlock 
                            key={`reasoning-${m.id}-${accumulatedReasoning.length}`} 
                            content={accumulatedReasoning} 
                            isStreaming={isReasoningStreaming}
                          />
                        );
                      }
                      
                      return renderedParts;
                    })()}
                  </div>
                ) : (
                  // 共享消息：显示内容 + 工具调用摘要
                  <div className="space-y-2">
                    {content && (
                      <div className="markdown-content">
                        <MarkdownView content={content} variant="goc" />
                      </div>
                    )}
                    {/* Render reasoning from synced data */}
                    {m.reasoning && (
                       <ReasoningBlock 
                         key={`reasoning-${m.id}`} 
                         content={m.reasoning} 
                         isStreaming={false} // Synced messages are always "done"
                       />
                    )}
                    {/* 从同步数据渲染工具调用 */}
                    {toolCallsFromSync.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-700/50">
                        {toolCallsFromSync.map((tc: any, idx: number) => (
                          <ToolCallInline 
                            key={tc.toolCallId || `sync-tool-${idx}`} 
                            part={{ type: `tool-${tc.toolName}`, state: tc.state, toolCallId: tc.toolCallId }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // 用户消息
        return (
          <div key={m.id} className={cn("flex gap-3", isMine ? "flex-row-reverse" : "flex-row")}>
            <div className="flex-shrink-0 relative group">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-zinc-400">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {displayName}
              </span>
            </div>
            
            <div className={cn(
              "relative max-w-[75%] p-3 rounded-xl text-sm border shadow-lg backdrop-blur-sm",
              isMine 
                ? "bg-zinc-800/80 border-zinc-700 text-zinc-100 rounded-tr-none"
                : "bg-zinc-900/80 border-zinc-600 text-zinc-200 rounded-tl-none"
            )}>
              {content && (
                <div className="markdown-content">
                  <MarkdownView content={content} variant="goc" />
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
