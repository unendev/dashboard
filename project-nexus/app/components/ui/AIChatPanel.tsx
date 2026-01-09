'use client';

/**
 * ==============================================================================
 * 🛠️ AI Chat Panel Component Contract (工程化契约)
 * ==============================================================================
 * 
 * 此通用组件封装了 AI 对话的标准逻辑，旨在为整个项目提供统一的 AI 交互体验。
 * 为了确保流式传输 (Streaming) 的稳定性和性能，调用方和后端必须遵守以下契约：
 * 
 * 1. 📦 SDK 版本要求:
 *    - Frontend: @ai-sdk/react (v5.0+)
 *    - Backend: ai (v5.0+)
 * 
 * 2. 🔌 通信协议 (Protocol):
 *    - 本项目目前采用 **GOC 兼容模式** (Legacy Alignment)。
 *    - 前端: 使用 `useChat` 配合 `DefaultChatTransport`。
 *    - 后端: 必须返回 `toUIMessageStreamResponse()` 格式。
 *    - ⚠️ 注意: 若升级到标准 Data Stream Protocol，需前后端同时调整。
 * 
 * 3. 📡 后端响应要求 (Backend Response):
 *    - 必须设置流式 Headers，防止 Next.js 缓冲 (Buffering):
 *      - `Transfer-Encoding: chunked`
 *      - `Connection: keep-alive`
 *      - `Cache-Control: no-cache`
 *    - 调用 `streamText` 时，建议使用同步调用 (const result = streamText(...)) 以匹配当前 setup。
 * 
 * 4. 🎨 UI 状态管理:
 *    - `isLoading`: 仅在 `status === 'submitted'` (等待首字节) 时显示独立 Loading 指示器。
 *    - `streaming`: 一旦开始接收数据，即隐藏独立 Loading，通过消息列表的流式更新提供反馈。
 * 
 * ==============================================================================
 */

import { useEffect, useRef, useState, useMemo, ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownView } from '@/app/components/shared/MarkdownView';
import { ReasoningBlock } from '@/app/components/shared/ReasoningBlock';

export interface AIChatPanelProps {
    /** 后端 API 路由地址，例如 '/api/chat/treasure-assistant' */
    apiEndpoint: string;
    /** 本地存储聊天记录的 Key */
    storageKey: string;
    /** 标题 */
    title?: string;
    /** 副标题/描述 */
    description?: string;
    /** 输入框占位符 */
    placeholder?: string;
    /** 发送请求时附带的额外 Body 数据 (用于 Context) */
    extraBody?: Record<string, any>;
    /** 关闭回调 */
    onClose: () => void;
    /** 外部样式类 */
    className?: string;
    /** 自定义头部右侧/底部的渲染内容 (可选) */
    renderContextBadge?: () => ReactNode;
    /** 空状态下的自定义显示 (可选) */
    emptyState?: ReactNode;
}

export function AIChatPanel({
    apiEndpoint,
    storageKey,
    title = 'AI 助手',
    description = '我是你的智能助手',
    placeholder = '输入消息...',
    extraBody,
    onClose,
    className,
    renderContextBadge,
    emptyState
}: AIChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');

    // 使用 Memo 确保 Transport 实例稳定
    const chatTransport = useMemo(() => new DefaultChatTransport({
        api: apiEndpoint,
    }), [apiEndpoint]);

    const { messages, sendMessage, status, setMessages } = useChat({
        transport: chatTransport,
        onFinish: () => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey, JSON.stringify(messages));
            }
        },
    });

    // 状态判断：Submitted (等待响应) vs Streaming (正在输出)
    const isSubmitted = status === 'submitted';
    const isStreaming = status === 'streaming';
    const isLoading = isSubmitted || isStreaming; // 用于禁用输入框

    // 加载/保存历史记录
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setMessages(parsed);
                    }
                } catch (e) {
                    console.error('[AIChatPanel] Failed to load history:', e);
                }
            }
        }
    }, [storageKey, setMessages]);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 每次消息变化也保存一次 (双重保险)
    useEffect(() => {
        if (messages.length > 0 && typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(messages));
        }
    }, [messages, storageKey]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        try {
            // body 传入 extraBody (例如 context)
            await sendMessage({ text: userMessage }, { body: extraBody });
        } catch (error) {
            console.error('[AIChatPanel] Failed to send message:', error);
            setInput(userMessage); // 失败回填
        }
    };

    return (
        <div className={cn("bg-[#0f172a] flex flex-col h-full border-l border-white/10 shadow-2xl overflow-hidden", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-semibold">{title}</h2>
                        <p className="text-xs text-white/50">{description}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Context Badge Slot */}
            {renderContextBadge && (
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 shrink-0">
                    {renderContextBadge()}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    emptyState || (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                <Sparkles size={32} className="text-white/20" />
                            </div>
                            <p className="text-white/40 text-sm">暂无消息</p>
                        </div>
                    )
                )}

                {messages.map((msg: any) => {
                    const isAI = msg.role === 'assistant';

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                'flex gap-3',
                                msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            {isAI && (
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <Sparkles size={14} className="text-white" />
                                </div>
                            )}
                            <div
                                className={cn(
                                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                                    msg.role === 'user'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white/5 text-white/90 border border-white/10'
                                )}
                            >
                                {isAI ? (
                                    <div className="space-y-2">
                                        {/* 优先处理 Parts (Reasoning + Text) */}
                                        {msg.parts && Array.isArray(msg.parts) ? (
                                            msg.parts.map((part: any, idx: number) => {
                                                if (part.type === 'reasoning') {
                                                    return (
                                                        <ReasoningBlock
                                                            key={`reasoning-${idx}`}
                                                            content={part.text}
                                                            isStreaming={isStreaming && idx === msg.parts.length - 1}
                                                        />
                                                    );
                                                }
                                                if (part.type === 'text') {
                                                    return (
                                                        <MarkdownView
                                                            key={`text-${idx}`}
                                                            content={part.text}
                                                            className="break-words"
                                                            variant="goc"
                                                        />
                                                    );
                                                }
                                                return null;
                                            })
                                        ) : (
                                            /* 兼容纯文本内容 */
                                            <>
                                                {/* 如果有顶层 reasoning 字段 (非标准但在某些适配器中可能存在) */}
                                                {msg.reasoning && (
                                                    <ReasoningBlock
                                                        content={msg.reasoning}
                                                        isStreaming={false}
                                                    />
                                                )}
                                                <MarkdownView
                                                    content={msg.content || (isSubmitted ? '...' : '')}
                                                    className="break-words"
                                                    variant="goc"
                                                />
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap break-words">
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* 独立 Loading 指示器：仅在等待响应 (Submitted) 阶段显示 */}
                {isSubmitted && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
                            <Loader2 size={16} className="text-indigo-400 animate-spin" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleFormSubmit} className="p-4 border-t border-white/10 shrink-0">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-white/5 disabled:text-white/30 text-white rounded-xl transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
}
