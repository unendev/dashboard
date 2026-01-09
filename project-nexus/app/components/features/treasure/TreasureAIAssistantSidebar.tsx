'use client';

import { useTreasureAIAssistant } from '@/app/store/treasure-ai-assistant';
import { TreasureAIChatPanel } from './TreasureAIChatPanel';

export function TreasureAIAssistantSidebar() {
    const { isOpen, context, closeSidebar } = useTreasureAIAssistant();

    // 如果处于创建或编辑模式，全局侧栏隐藏，交给 Modal 里的 SidePanel 显示
    // 或者如果不处于打开状态，也不显示
    const shouldShow = isOpen && (!context.type || context.type === 'browse');

    if (!shouldShow) return null;

    return (
        <TreasureAIChatPanel
            onClose={closeSidebar}
            className="fixed inset-y-0 right-0 w-[400px] z-[100]"
        />
    );
}
