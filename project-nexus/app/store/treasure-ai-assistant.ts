import { create } from 'zustand';

export interface TreasureContext {
    type: 'create' | 'edit' | 'browse' | null;
    treasureData?: {
        title: string;
        content: string;
        tags: string[]; // 仅 #领域/ 和 #概念/ 标签
    };
}

interface TreasureAIAssistantStore {
    isOpen: boolean;
    context: TreasureContext;
    toggleSidebar: () => void;
    openSidebar: () => void;
    closeSidebar: () => void;
    setContext: (context: TreasureContext) => void;
    clearContext: () => void;
}

export const useTreasureAIAssistant = create<TreasureAIAssistantStore>((set) => ({
    isOpen: false,
    context: {
        type: null,
    },

    toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
    openSidebar: () => set({ isOpen: true }),
    closeSidebar: () => set({ isOpen: false }),

    setContext: (context) => set({ context }),
    clearContext: () => set({ context: { type: null } }),
}));
