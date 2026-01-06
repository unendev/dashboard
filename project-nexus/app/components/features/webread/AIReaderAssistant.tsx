'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useReaderStore, ReaderBubble } from './useReaderStore';
import { useParams } from 'next/navigation';
import { Sparkles, X, ChevronRight, Save, MessageSquare } from 'lucide-react';
import { useChat } from '@ai-sdk/react';

interface AIResponseContent {
  analysis: string;
  followUpQuestions: string[];
}

// Helper to extract text from Vercel AI SDK v2/v3+ messages (which use parts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTextContent(message: any): string {
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
  }
  return '';
}

export default function AIReaderAssistant() {
  const { selection, setSelection, currentCfi, addBubble, bubbles } = useReaderStore();
  const params = useParams();
  const currentBookId = params?.id as string || 'unknown-book';
  
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const [selectedBubble, setSelectedBubble] = useState<ReaderBubble | null>(null);
  const [input, setInput] = useState('');

  // AI SDK Hook - using type assertion for compatibility
  const chatResult = useChat() as any;
  const messages = chatResult.messages || [];
  const isLoading = chatResult.isLoading || chatResult.status === 'streaming';
  const setMessages = chatResult.setMessages || (() => {});
  
  const append = useCallback(async (message: { role: string; content: string }) => {
    if (chatResult.append) {
      return chatResult.append(message);
    }
    // Fallback: use handleSubmit with input
    if (chatResult.setInput && chatResult.handleSubmit) {
      chatResult.setInput(message.content);
      // Trigger submit
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      return chatResult.handleSubmit(fakeEvent);
    }
  }, [chatResult]);

  useEffect(() => {
    const handleBubbleClick = (e: CustomEvent<string>) => {
      const bubble = bubbles.find(b => b.id === e.detail);
      if (bubble) {
        setSelectedBubble(bubble);
        setActiveAnalysis(null);
        setSelection(null);
      }
    };

    window.addEventListener('ept-bubble-click', handleBubbleClick as EventListener);
    return () => {
      window.removeEventListener('ept-bubble-click', handleBubbleClick as EventListener);
    };
  }, [bubbles, setSelection]);

  const handleAutoAnalyze = useCallback(async () => {
    if (!selection) return;
    
    setMessages([]);
    setActiveAnalysis(selection.text);
    setSelectedBubble(null);
    
    await append({
        role: 'user',
        content: `请分析这段文本，简要说明其核心隐喻或深层含义，并提供3个值得思考的追问方向。请将结果以如下结构输出：\n\n分析：[AI的分析内容]\n\n追问方向：\n- [追问问题1]\n- [追问问题2]\n- [追问问题3]\n\n文本：\n"${selection.text}"`
    });
  }, [selection, append, setMessages]);

  const handleSaveAsBubble = useCallback(async () => {
    if (!activeAnalysis || !selection || !currentBookId || messages.length === 0) return;

    const latestAssistantMessage = messages[messages.length - 1];
    if (!latestAssistantMessage || latestAssistantMessage.role !== 'assistant') return;

    const msgContent = getTextContent(latestAssistantMessage);

    const parsedContent: AIResponseContent = { analysis: msgContent, followUpQuestions: [] };
    try {
      const content = msgContent.trim();
      const analysisMatch = content.match(/分析：\s*([\s\S]*?)(?:\n\n追问方向：|$)/);
      const questionsMatch = content.match(/追问方向：\s*([\s\S]*)/);
      
      if (analysisMatch) parsedContent.analysis = analysisMatch[1].trim();
      if (questionsMatch) parsedContent.followUpQuestions = questionsMatch[1].split(/\n|- /).map((q: string) => q.trim()).filter((q: string) => q.length > 0);

    } catch (e) {
      console.warn('Failed to parse AI response for saving:', e);
    }

    const bubbleData = {
      bookId: currentBookId,
      chapter: currentCfi, 
      text: selection.text, 
      note: parsedContent.analysis, 
      highlight: '#9333ea', 
      position: selection.cfiRange, 
      type: 'AI_INSIGHT', 
      aiContent: JSON.stringify(parsedContent), 
    };

    try {
      const res = await fetch('/api/webread/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bubbleData),
      });

      if (res.ok) {
        const savedNote = await res.json();
        addBubble({
          id: savedNote.id,
          cfi: savedNote.position, 
          snippet: parsedContent.analysis.substring(0, 50) + '...',
          fullAnalysis: parsedContent.analysis,
          type: 'AI_INSIGHT',
        });
        alert('灵感气泡已保存！');
        setActiveAnalysis(null); 
        setSelection(null);
      } else {
        const error = await res.json();
        alert('保存失败: ' + error.error);
      }
    } catch (e) {
      console.error('Error saving AI bubble:', e);
      alert('保存灵感气泡失败');
    }
  }, [activeAnalysis, selection, currentBookId, messages, currentCfi, addBubble, setSelection]);

  const followUpQuestions = useMemo(() => {
    if (!messages.length || isLoading) return [];
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return [];
    
    try {
      const msgContent = getTextContent(lastMessage);
      const content = msgContent.trim();
      const questionsMatch = content.match(/追问方向：\s*([\s\S]*)/);
      if (questionsMatch) {
          return questionsMatch[1].split(/\n|- /).map((q: string) => q.trim()).filter((q: string) => q.length > 0);
      }
      return [];
    } catch {
      return [];
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    await append({
        role: 'user',
        content: input
    });
    setInput('');
  };

  if (!selection && !activeAnalysis && !selectedBubble) return null;

  return (
    <>
      {/* 1. 划词悬浮菜单 */}
      {selection && !activeAnalysis && !selectedBubble && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in z-40 border border-gray-100">
           <span className="text-sm font-medium text-gray-500 max-w-[200px] truncate">
             {selection.text}
           </span>
           <div className="h-4 w-px bg-gray-200" />
           <button 
             onClick={handleAutoAnalyze}
             className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
           >
             <Sparkles className="w-4 h-4" />
             <span className="whitespace-nowrap">AI 解析</span>
           </button>
           <button onClick={() => setSelection(null)} className="text-gray-400 hover:text-gray-600">
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {/* 2. 分析结果面板 */}
      {activeAnalysis && (
        <div className="absolute top-4 right-4 bottom-16 w-96 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-right-10 fade-in z-50">
           {/* Header */}
           <div className="p-4 border-b bg-gray-50/50 flex justify-between items-start">
              <div>
                <h3 className="font-serif font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Heptapod Insight
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic border-l-2 border-purple-200 pl-2">
                    &quot;{activeAnalysis}&quot;
                </p>
              </div>
              <button 
                onClick={() => { setActiveAnalysis(null); setSelection(null); }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
           </div>

           {/* Content */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.filter((m: any) => m.role === 'assistant').map((msg: any, idx: number) => (
                  <div key={idx} className="prose prose-sm prose-purple max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: getTextContent(msg).replace(/\n/g, '<br/>') }} />
                  </div>
              ))}
              {isLoading && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      正在解读时间线...
                  </div>
              )}
           </div>

           {/* Quick Actions (追问) */}
           {!isLoading && messages.length > 0 && (
               <div className="p-4 border-t bg-gray-50 space-y-2">
                   <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">继续追问</p>
                   {followUpQuestions.map((q: string, idx: number) => (
                     <button 
                       key={idx}
                       onClick={() => append({ role: 'user', content: q })}
                       className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-purple-300 hover:text-purple-700 transition-colors flex items-center justify-between group"
                     >
                       <span>{q}</span>
                       <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                     </button>
                   ))}
                   
                   <button
                     onClick={handleSaveAsBubble}
                     className="w-full text-left px-3 py-2 bg-purple-100 border border-purple-200 rounded-lg text-sm text-purple-800 hover:border-purple-400 transition-colors flex items-center justify-center gap-2"
                   >
                     <Save className="w-4 h-4" />
                     <span>保存为灵感气泡</span>
                   </button>

                   <form onSubmit={handleSubmit} className="relative">
                       <input 
                         type="text" 
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                         placeholder="输入你的问题..."
                         className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                       />
                       <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600">
                         <ChevronRight className="w-4 h-4" />
                       </button>
                   </form>
               </div>
           )}
        </div>
      )}

      {/* 3. 已保存气泡详情 */}
      {selectedBubble && (
        <div className="absolute top-4 right-4 bottom-16 w-96 bg-white/95 backdrop-blur shadow-2xl rounded-xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-right-10 fade-in z-50">
          <div className="p-4 border-b bg-purple-50 flex justify-between items-start">
            <div>
              <h3 className="font-serif font-bold text-purple-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                灵感气泡
              </h3>
              <p className="text-xs text-purple-600 mt-1 italic">
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <button 
              onClick={() => setSelectedBubble(null)}
              className="text-purple-400 hover:text-purple-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
             <div className="prose prose-sm prose-purple max-w-none">
                <div dangerouslySetInnerHTML={{ __html: (selectedBubble.fullAnalysis || selectedBubble.snippet).replace(/\n/g, '<br/>') }} />
             </div>
          </div>
        </div>
      )}
    </>
  );
}
