'use client';

import { useTreasureAIAssistant } from '@/app/store/treasure-ai-assistant';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { AIChatPanel } from '@/app/components/ui/AIChatPanel';

const STORAGE_KEY = 'treasure-ai-chat-history';

interface TreasureAIChatPanelProps {
    onClose: () => void;
    className?: string; // 允许外部控制外层样式
}

export function TreasureAIChatPanel({ onClose, className }: TreasureAIChatPanelProps) {
    const { context } = useTreasureAIAssistant();

    // Context Badge 渲染逻辑
    const renderContextBadge = () => {
        if (!context.type) return null;

        const badges = {
            create: { text: '创建模式', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
            edit: { text: '编辑模式', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
            browse: { text: '浏览模式', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
        };

        const badge = badges[context.type as keyof typeof badges] || badges.browse;
        return (
            <>
                <div className={cn('px-2 py-1 rounded-full text-xs border', badge.color)}>
                    {badge.text}
                </div>
                {context.treasureData && (
                    <span className="text-xs text-white/40 truncate flex-1">
                        {context.treasureData.title || '未命名'}
                    </span>
                )}
            </>
        );
    };

    // Empty State 渲染逻辑
    const emptyState = (
        <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center">
                <Sparkles size={32} className="text-indigo-400" />
            </div>
            <h3 className="text-white/80 font-medium mb-2">AI 标签助手已就绪</h3>
            <p className="text-white/40 text-sm max-w-xs mx-auto">
                我可以帮你优化标签体系，提供领域和概念标签建议
            </p>
        </div>
    );

    return (
        <AIChatPanel
            apiEndpoint="/api/chat/treasure-assistant"
            storageKey={STORAGE_KEY}
            title="AI 标签助手"
            description="专注于领域和概念标签建议"
            placeholder="询问标签建议..."
            extraBody={{ context }}
            onClose={onClose}
            className={className}
            renderContextBadge={renderContextBadge}
            emptyState={emptyState}
        />
    );
}

