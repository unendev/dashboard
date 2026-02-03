"use client";

import { useRef, useEffect, useState, forwardRef } from "react";
import { Bot, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "@/app/components/shared/MarkdownView";
import { ReasoningBlock } from "@/app/components/shared/ReasoningBlock";
import { ToolCallInline } from "./ToolCallInline";

interface MessageListProps {
  messages: any[];
  status: string;
  me: any;
  others: readonly any[];
  getUIMessageContent: (msg: any) => string;
  onDeleteMessage?: (messageId: string) => void;
  sharedMessages?: any[];
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(({
  messages,
  status,
  me,
  others,
  getUIMessageContent,
  onDeleteMessage,
  sharedMessages = []
}, ref) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // 智能滚动逻辑
  const handleScroll = () => {
    const container = ref && 'current' in ref ? ref.current : null;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
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

  // 长按处理（移动端）
  const handleTouchStart = (messageId: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressMessageId(messageId);
    }, 500); // 500ms 长按
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDeleteClick = (messageId: string) => {
    if (confirm('确定要删除这条消息吗？所有人都将看不到这条消息。')) {
      onDeleteMessage?.(messageId);
      setLongPressMessageId(null);
    }
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
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
                  NEXUS AI
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
                            className="bg-zinc-800/50 border-zinc-600 text-zinc-400"
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
                        className="bg-zinc-800/50 border-zinc-600 text-zinc-400"
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
          <div key={m.id} className={cn("flex gap-3 group relative", isMine ? "flex-row-reverse" : "flex-row")}>
            <div className="flex-shrink-0 relative group/avatar">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-zinc-400">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap z-10">
                {displayName}
              </span>
            </div>

            <div 
              className={cn(
                "relative max-w-[75%] p-3 rounded-xl text-sm border shadow-lg backdrop-blur-sm",
                isMine
                  ? "bg-zinc-800/80 border-zinc-700 text-zinc-100 rounded-tr-none"
                  : "bg-zinc-900/80 border-zinc-600 text-zinc-200 rounded-tl-none"
              )}
              onTouchStart={() => handleTouchStart(m.id)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              {/* 删除按钮 - 桌面端 hover 显示 */}
              {onDeleteMessage && (
                <button
                  onClick={() => handleDeleteClick(m.id)}
                  className={cn(
                    "absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all",
                    "opacity-0 group-hover:opacity-100",
                    // 移动端长按显示
                    longPressMessageId === m.id && "opacity-100"
                  )}
                  title="删除消息"
                >
                  <Trash2 size={12} />
                </button>
              )}

              {/* Attachments */}
              {(m.attachments || m.experimental_attachments) && (m.attachments || m.experimental_attachments).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {(m.attachments || m.experimental_attachments).map((url: any, i: number) => {
                    // AI SDK might use object instead of string for attachments, but we are using string URLs
                    const src = typeof url === 'string' ? url : url.url;
                    return (
                      <div key={i} className="relative group/img">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt="attachment"
                          className="max-w-[200px] max-h-[200px] rounded-lg border border-zinc-700/50 cursor-pointer hover:border-cyan-500/50 transition-colors"
                          onClick={() => window.open(src, '_blank')}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

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
});

MessageList.displayName = 'MessageList';
