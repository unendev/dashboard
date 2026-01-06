// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from 'react';
import { TextInteractionWrapper } from './TextInteractionWrapper';

// Define message type
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const initialMessage: Message = {
  id: 'guest-welcome',
  role: 'assistant',
  content: `Привет! Я твой ИИ-помощник для изучения русского языка. Спроси меня что-нибудь! 

(注意：访客模式下聊天记录不保存，刷新页面会丢失。)`,
};

export function GuestChatClient() {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);

  // Keep auto-scrolling to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    // Add user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Call AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          conversationId: 'guest-chat',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage = '';
      const assistantMessageId = Date.now().toString() + '-ai';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantMessage += data.content;
                
                // Update the message in real-time
                setMessages(prev => {
                  const existing = prev.find(m => m.id === assistantMessageId);
                  if (existing) {
                    return prev.map(m => 
                      m.id === assistantMessageId ? { ...m, content: assistantMessage } : m
                    );
                  } else {
                    return [...prev, {
                      id: assistantMessageId,
                      role: 'assistant',
                      content: assistantMessage,
                    }];
                  }
                });
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: '抱歉，聊天出错了，请稍后重试。',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold mb-4 text-center">AI俄语对话 (访客模式)</h1>
      
      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-grow bg-white dark:bg-gray-800 shadow-inner rounded-lg p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          msg.role !== 'system' && (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg shadow ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
                <TextInteractionWrapper>
                  <p className="text-lg whitespace-pre-wrap">{msg.content}</p>
                </TextInteractionWrapper>
              </div>
            </div>
          )
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg shadow bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <p className="text-lg animate-pulse">正在生成回复...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="问我一些俄语问题..."
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
}
