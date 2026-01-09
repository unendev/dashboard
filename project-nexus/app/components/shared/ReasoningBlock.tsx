"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningBlockProps {
    content: string;
    isStreaming?: boolean;
    className?: string;
    autoCollapse?: boolean;
}

/**
 * 共享的推理过程显示组件
 * 支持流式时自动展开，完成后自动折叠
 * 样式自适应（支持传入 className 覆盖）
 */
export const ReasoningBlock = ({
    content,
    isStreaming = false,
    className,
    autoCollapse = true
}: ReasoningBlockProps) => {
    const [expanded, setExpanded] = useState(true);

    const contentRef = useRef<HTMLDivElement>(null);

    // 流式传输时自动滚动到底部
    useEffect(() => {
        if (isStreaming && expanded && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [content, isStreaming, expanded]);

    // 完成后自动折叠
    useEffect(() => {
        if (autoCollapse && !isStreaming && content.length > 0) {
            setExpanded(false);
        }
    }, [isStreaming, content.length, autoCollapse]);

    return (
        <div className={cn(
            "my-2 border rounded-lg overflow-hidden transition-colors",
            // 默认暗色风格 (兼容 GOC/Treasure)，如果是亮色环境需通过 className 覆盖
            "border-white/10 bg-white/5",
            className
        )}>
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-xs transition-colors hover:bg-white/5",
                    "text-white/60" // Default text color
                )}
            >
                <span>{isStreaming ? '💭 思考中...' : '💭 思考过程'}</span>
                <span className="opacity-60 text-[10px]">({content.length}字)</span>
                <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${expanded ? '' : '-rotate-90'}`} />
            </button>
            {expanded && (
                <div
                    ref={contentRef}
                    className={cn(
                        "px-3 py-2 text-xs border-t max-h-64 overflow-y-auto custom-scrollbar",
                        "border-white/10 text-white/50"
                    )}
                >
                    <pre className="whitespace-pre-wrap font-mono font-light leading-relaxed">{content}</pre>
                    {isStreaming && <span className="inline-block w-1.5 h-3 bg-current animate-pulse ml-1 align-middle" />}
                </div>
            )}
        </div>
    );
};
