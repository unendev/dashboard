'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Sparkles, Send } from 'lucide-react';

export default function SmartCreateLogForm({ onSmartCreate, onCancel }: { onSmartCreate?: (input: string) => void, onCancel?: () => void }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!input.trim() || !onSmartCreate) return;
    onSmartCreate(input);
    setInput('');
    onCancel?.();
  };

  return (
    <div className="space-y-4 py-2">
      <div className="text-center mb-6">
        <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-100">AI 智能创建</h2>
      </div>
      <Textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())} placeholder="例如：学习 React (学习) 1h" className="min-h-[120px] bg-gray-800 text-lg" />
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} disabled={!input.trim()} className="flex-[2] bg-indigo-600 h-12 text-lg">立即创建</Button>
      </div>
    </div>
  );
}
