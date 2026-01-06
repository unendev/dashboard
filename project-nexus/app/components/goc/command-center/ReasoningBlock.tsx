"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

// 推理过程显示组件 - 流式时展开，完成后可折叠
export const ReasoningBlock = ({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) => {
  const [expanded, setExpanded] = useState(true);
  
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming]);
  
  // 完成后自动折叠
  useEffect(() => {
    if (!isStreaming && content.length > 0) {
      setExpanded(false);
    }
  }, [isStreaming, content.length]);
  
  return (
    <div className="my-2 border border-zinc-600 rounded-lg overflow-hidden bg-zinc-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs text-zinc-400 hover:bg-zinc-700/50 transition-colors"
      >
        <span>{isStreaming ? '💭 思考中...' : '💭 思考过程'}</span>
        <span className="text-zinc-500 text-[10px]">({content.length}字)</span>
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div 
          ref={contentRef}
          className="px-3 py-2 text-xs text-zinc-400 border-t border-zinc-700 max-h-48 overflow-y-auto custom-scrollbar"
        >
          <pre className="whitespace-pre-wrap font-mono">{content}</pre>
          {isStreaming && <span className="inline-block w-2 h-3 bg-zinc-400 animate-pulse ml-0.5" />}
        </div>
      )}
    </div>
  );
};
