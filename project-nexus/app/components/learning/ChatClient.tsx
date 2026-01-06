"use client";

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React from 'react';
import { saveChatMessage, updateConversationTitle } from '../../russian/actions';
import { TextInteractionWrapper } from './TextInteractionWrapper';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatClientProps {
  initialMessages: any[];
  conversationId: string;
}

// Helper component to handle mixed content (strings + elements) within Markdown
const InteractiveChildren = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return <TextInteractionWrapper>{child}</TextInteractionWrapper>;
        }
        return child;
      })}
    </>
  );
};

// Custom Markdown Components Configuration
const markdownComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed"><InteractiveChildren>{children}</InteractiveChildren></p>,
  li: ({ children }: any) => <li className="mb-1 ml-4"><InteractiveChildren>{children}</InteractiveChildren></li>,
  h1: ({ children }: any) => <h1 className="text-xl font-bold mt-4 mb-2"><InteractiveChildren>{children}</InteractiveChildren></h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold mt-3 mb-2"><InteractiveChildren>{children}</InteractiveChildren></h2>,
  h3: ({ children }: any) => <h3 className="text-md font-bold mt-2 mb-1"><InteractiveChildren>{children}</InteractiveChildren></h3>,
  strong: ({ children }: any) => <strong className="font-semibold text-blue-300"><InteractiveChildren>{children}</InteractiveChildren></strong>,
  em: ({ children }: any) => <em className="italic text-gray-300"><InteractiveChildren>{children}</InteractiveChildren></em>,
  code: ({ children, className }: any) => {
    // Don't wrap code blocks with interactive text (avoid splitting code)
    const isInline = !className;
    return isInline ? (
      <code className="bg-gray-800 px-1 py-0.5 rounded text-sm text-yellow-300 font-mono">{children}</code>
    ) : (
      <code className="block bg-gray-900 p-2 rounded text-sm text-gray-300 overflow-x-auto font-mono my-2 border border-gray-700">{children}</code>
    );
  },
  ul: ({ children }: any) => <ul className="list-disc ml-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal ml-5 mb-2 space-y-1">{children}</ol>,
  blockquote: ({ children }: any) => <blockquote className="border-l-2 border-gray-500 pl-3 italic text-gray-400 my-2">{children}</blockquote>,
};

export function ChatClient({ initialMessages, conversationId }: ChatClientProps) {
  // Normalize initial messages
  const [messages, setMessages] = useState<Message[]>(() => {
    return (initialMessages || []).map((m: any) => ({
      id: m.id || Math.random().toString(36).substring(7),
      role: m.role,
      content: m.content || (Array.isArray(m.parts) ? m.parts.map((p: any) => p.text).join('') : '')
    }));
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); 
  const [isThinking, setIsThinking] = useState(false); 
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userContent = input;
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: userContent
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsThinking(true);

    try {
      saveChatMessage({ conversationId, role: 'user', content: userContent });

      if (messages.length === 0) {
        const title = userContent.substring(0, 20) + (userContent.length > 20 ? '...' : '');
        updateConversationTitle(conversationId, title);
      }

      const systemMessage = {
        role: 'system' as const,
        content: '你是一位经验丰富的俄语老师。当我说中文时，请用中文解释相关的俄语知识（单词、语法、表达）；当我说俄语时，请纠正我的错误并用自然的俄语与我对话。请循循善诱，解释清晰。'
      };

      const historyMessages = messages.filter(m => m.role !== 'system');

      const apiMessages = [systemMessage, ...historyMessages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          conversationId 
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      if (!response.body) throw new Error('No response body');

      const assistantMessageId = Math.random().toString(36).substring(7);
      
      setIsThinking(false);
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: ''
      }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAssistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          let contentToAdd = '';
          if (line.startsWith('0:')) {
            try {
              const jsonStr = line.substring(2); 
              contentToAdd = JSON.parse(jsonStr);
            } catch (e) { }
          } else {
             contentToAdd = line;
          }

          if (contentToAdd) {
            fullAssistantContent += contentToAdd;
            setMessages(prev => prev.map(m => 
              m.id === assistantMessageId 
                ? { ...m, content: fullAssistantContent }
                : m
            ));
          }
        }
      }

      if (fullAssistantContent) {
        saveChatMessage({ conversationId, role: 'assistant', content: fullAssistantContent });
      }

    } catch (err: any) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 text-gray-100">
      
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4"
      >
        {messages.length === 0 && <div className="text-gray-500 text-center mt-10 text-lg">暂无消息，开始对话吧！</div>}
        
        {messages.map((m, index) => {
          const isLast = index === messages.length - 1;
          const isStreaming = isLoading && isLast && m.role === 'assistant';

          if (m.role === 'system') return null;

          return (
            <div 
              key={m.id} 
              className={`flex ${m.role === 'user' 
                  ? 'justify-end' 
                  : 'justify-start'
              }`}
            >
              <div 
                className={`max-w-[85%] lg:max-w-[75%] p-3 rounded-xl shadow-md ${m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-700 text-gray-100 rounded-bl-none'
                }`}
              >
                <div className="font-sans text-base">
                  {isStreaming ? (
                    // Stream plain text to prevent selection jumping
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    // Render Interactive Markdown
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {m.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex justify-start">
            <div className="max-w-[70%] lg:max-w-[60%] p-3 rounded-xl shadow-md bg-gray-700 text-gray-100 rounded-bl-none">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}

      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <form onSubmit={sendMessage} className="flex gap-3">
            <input
            className="flex-1 border border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-gray-100 placeholder-gray-400 transition-all duration-200"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的消息..."
            disabled={isLoading}
            />
            <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200"
            >
            {isLoading ? '发送中...' : '发送'}
            </button>
        </form>
      </div>
    </div>
  );
}
