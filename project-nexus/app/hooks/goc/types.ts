export type AIMode = 'encyclopedia' | 'game' | 'casual';
export type AIProvider = 'deepseek' | 'gemini';

export interface SharedMessage {
  id: string;
  clientMsgId?: string;
  role: 'user' | 'assistant';
  content: string;
  userName?: string;
  createdAt: number;
  reasoning?: string;
  toolCalls?: Array<{
    toolName: string;
    state: string;
    toolCallId?: string;
  }>;
  attachments?: string[];
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  group?: string;
  parentId?: string;
  ownerId?: string;
  ownerName?: string;
}

export interface PlayerNote {
  content: string;
  name: string;
}

export const MODEL_CONFIG: Record<AIProvider, { label: string; models: { id: string; name: string; desc: string; thinking?: boolean }[] }> = {
  deepseek: {
    label: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', desc: '通用对话' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', desc: '深度推理', thinking: true },
    ]
  },
  gemini: {
    label: 'Gemini',
    models: [
      { id: 'gemini-2.5-flash', name: '2.5 Flash', desc: '官方稳定版', thinking: true },
      { id: 'gemini-3-flash', name: '3.0 Flash', desc: '第三方兼容', thinking: true },
      { id: 'gemini-3-pro-high', name: '3.0 Pro High', desc: '深度推理/高算力', thinking: true },
      { id: 'gemini-3-pro-image-preview', name: '3.0 Pro Imagen', desc: '文生图/Image Gen', thinking: false },
    ]
  }
};
