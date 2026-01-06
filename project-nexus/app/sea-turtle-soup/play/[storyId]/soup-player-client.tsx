'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/game';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Skeleton } from '@/app/components/ui/skeleton';

export default function SoupPlayerClient({
  storyId,
  initialTitle,
}: {
  storyId: string;
  initialTitle: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `汤面来了：${initialTitle}。请开始提问吧！`,
    },
  ]);
  const [storyTitle, setStoryTitle] = useState(initialTitle);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/sea-turtle-soup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages, storyId }),
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.message || !data.message.content) {
        throw new Error('Invalid response from server');
      }

      const assistantMessage = data.message as ChatMessage;

      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error('Error fetching response:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，出错了，请稍后再试。',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl h-[90vh] flex flex-col">
        <CardHeader>
          <CardTitle>{storyTitle || '海龟汤'}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4 space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {msg.role === 'assistant' && (
                <Avatar className="border">
                  <AvatarFallback>GM</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg px-4 py-2 max-w-[75%] shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <Avatar className="border">
                  <AvatarFallback>我</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Avatar className="border">
                <AvatarFallback>GM</AvatarFallback>
              </Avatar>
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardFooter className="p-4 border-t">
          <form
            onSubmit={handleSubmit}
            className="flex w-full items-center space-x-2"
          >
            <Input
              type="text"
              placeholder="对他提问，例如“他是名人吗？”"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              autoFocus
              className="flex-grow"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? '思考中...' : '发送'}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
