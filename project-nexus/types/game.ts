export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export interface Story {
  id: string;
  title: string;
  solution: string;
  theme: '怪谈' | '悬疑' | '日常' | '其他';
}
