'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';
import { useTreasureAIAssistant } from '@/app/store/treasure-ai-assistant';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'treasure-ai-chat-history';

interface TreasureAIChatPanelProps {
    onClose: () => void;
    className?: string; // 允许外部控制外层样式
}

export function TreasureAIChatPanel({ onClose, className }: TreasureAIChatPanelProps) {
    const { context } = useTreasureAIAssistant();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');

    const chatTransport = useMemo(() => new DefaultChatTransport({
        api: '/api/chat/treasure-assistant',
    }), []);

    const { messages, sendMessage, status, setMessages } = useChat({
        transport: chatTransport,
        onFinish: () => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
            }
        },
    });

    const isLoading = status === 'streaming' || status === 'submitted';

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setMessages(parsed);
                    }
                } catch (e) {
                    console.error('Failed to load chat history:', e);
                }
            }
        }
    }, [setMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0 && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        }
    }, [messages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        try {
            await sendMessage({ text: userMessage }, { body: { context } });
        } catch (error) {
            console.error('Failed to send message:', error);
            setInput(userMessage);
        }
    };

    const getContextBadge = () => {
        if (!context.type) return null;

        const badges = {
            create: { text: '创建模式', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
            edit: { text: '编辑模式', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
            browse: { text: '浏览模式', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
        };

        const badge = badges[context.type as keyof typeof badges] || badges.browse;
        return (
            <div className={cn('px-2 py-1 rounded-full text-xs border', badge.color)}>
                {badge.text}
            </div>
        );
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
                        <h2 className="text-white font-semibold">AI 标签助手</h2>
                        <p className="text-xs text-white/50">专注于领域和概念标签建议</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Context Badge */}
            {context.type && (
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 shrink-0">
                    {getContextBadge()}
                    {context.treasureData && (
                        <span className="text-xs text-white/40 truncate flex-1">
                            {context.treasureData.title || '未命名'}
                        </span>
                    )}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center">
                            <Sparkles size={32} className="text-indigo-400" />
                        </div>
                        <h3 className="text-white/80 font-medium mb-2">AI 标签助手已就绪</h3>
                        <p className="text-white/40 text-sm max-w-xs mx-auto">
                            我可以帮你优化标签体系，提供领域和概念标签建议
                        </p>
                    </div>
                )}

                {messages.map((msg: any) => {
                    // Debug: 打印消息结构
                    // console.log('Rendering message:', msg);

                    // 获取显示内容：优先使用 content，如果为空尝试提取 parts 中的 text
                    let displayContent = msg.content;
                    if (!displayContent && msg.parts && Array.isArray(msg.parts)) {
                        displayContent = msg.parts
                            .filter((part: any) => part.type === 'text')
                            .map((part: any) => part.text)
                            .join('');
                    }

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                'flex gap-3',
                                msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            {msg.role === 'assistant' && (
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
                                <div className="whitespace-pre-wrap break-words">
                                    {displayContent || (isLoading && msg.role === 'assistant' ? '...' : '')}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {status === 'submitted' && (
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

            {/* Input */}
            <form onSubmit={handleFormSubmit} className="p-4 border-t border-white/10 shrink-0">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="询问标签建议..."
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
                <p className="text-xs text-white/30 mt-2">
                    💡 提示：我会根据当前上下文提供标签建议，你可以手动复制到标签输入框
                </p>
            </form>
        </div>
    );
}
