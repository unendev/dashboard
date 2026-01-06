"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Layout } from "lucide-react";

interface GocLayoutProps {
  left: React.ReactNode;
  middle: React.ReactNode;
  right: React.ReactNode;
}

export default function GocLayout({ left, middle, right }: GocLayoutProps) {
  // 面板宽度百分比 (桌面端)
  const [leftWidth, setLeftWidth] = useState(25);
  const [rightWidth, setRightWidth] = useState(30);
  
  // 移动端当前显示的面板
  const [mobileActiveTab, setMobileActiveTab] = useState<'left' | 'middle' | 'right'>('middle');

  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // 开始调整左侧
  const startResizingLeft = useCallback(() => {
    isResizingLeft.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  // 开始调整右侧
  const startResizingRight = useCallback(() => {
    isResizingRight.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    isResizingLeft.current = false;
    isResizingRight.current = false;
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;

    if (isResizingLeft.current) {
      const newWidth = ((e.clientX - containerRect.left) / containerWidth) * 100;
      // 限制范围 10% - 40%
      if (newWidth > 10 && newWidth < 40) {
        setLeftWidth(newWidth);
      }
    } else if (isResizingRight.current) {
      const newWidth = ((containerRect.right - e.clientX) / containerWidth) * 100;
      // 限制范围 15% - 50%
      if (newWidth > 15 && newWidth < 50) {
        setRightWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [onMouseMove, stopResizing]);

  return (
    <div ref={containerRef} className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] relative">
      
      {/* --- 桌面端布局 --- */}
      <div className="hidden md:flex w-full h-full">
        {/* Left Panel */}
        <div style={{ width: `${leftWidth}%` }} className="h-full overflow-hidden">
          {left}
        </div>

        {/* Left Resize Handle */}
        <div 
          onMouseDown={startResizingLeft}
          className="w-1 hover:w-1.5 bg-zinc-800 hover:bg-cyan-500/50 cursor-col-resize transition-all h-full z-10 flex items-center justify-center group" 
        >
           <div className="w-[1px] h-12 bg-zinc-700 group-hover:bg-cyan-400 opacity-20" />
        </div>

        {/* Middle Panel */}
        <div style={{ width: `${100 - leftWidth - rightWidth}%` }} className="h-full overflow-hidden border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-0">
          {middle}
        </div>

        {/* Right Resize Handle */}
        <div 
          onMouseDown={startResizingRight}
          className="w-1 hover:w-1.5 bg-zinc-800 hover:bg-cyan-500/50 cursor-col-resize transition-all h-full z-10 flex items-center justify-center group" 
        >
           <div className="w-[1px] h-12 bg-zinc-700 group-hover:bg-cyan-400 opacity-20" />
        </div>

        {/* Right Panel */}
        <div style={{ width: `${rightWidth}%` }} className="h-full overflow-hidden">
          {right}
        </div>
      </div>

      {/* --- 移动端布局 --- */}
      <div className="flex md:hidden flex-col w-full h-full relative">
        {/* 内容区 - 使用 CSS 隐藏保留状态 */}
        <div className="flex-1 relative overflow-hidden">
          <div className={cn("absolute inset-0 overflow-hidden transition-opacity duration-300", mobileActiveTab === 'left' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
            {left}
          </div>
          <div className={cn("absolute inset-0 overflow-hidden transition-opacity duration-300", mobileActiveTab === 'middle' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
            {middle}
          </div>
          <div className={cn("absolute inset-0 overflow-hidden transition-opacity duration-300", mobileActiveTab === 'right' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
            {right}
          </div>
        </div>

        {/* 底部导航切换 (仅移动端显示) */}
        <div className="h-14 border-t border-zinc-800 bg-zinc-950 flex items-center justify-around px-4">
          <button 
            onClick={() => setMobileActiveTab('left')}
            className={cn("flex flex-col items-center gap-1 p-2 transition-colors", mobileActiveTab === 'left' ? "text-cyan-400" : "text-zinc-500")}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[10px] font-bold">BOARD</span>
          </button>
          <button 
            onClick={() => setMobileActiveTab('middle')}
            className={cn("flex flex-col items-center gap-1 p-2 transition-colors", mobileActiveTab === 'middle' ? "text-cyan-400" : "text-zinc-500")}
          >
            <Layout className="w-5 h-5" />
            <span className="text-[10px] font-bold">HUB</span>
          </button>
          <button 
            onClick={() => setMobileActiveTab('right')}
            className={cn("flex flex-col items-center gap-1 p-2 transition-colors", mobileActiveTab === 'right' ? "text-cyan-400" : "text-zinc-500")}
          >
            <ChevronRight className="w-5 h-5" />
            <span className="text-[10px] font-bold">VIEW</span>
          </button>
        </div>
      </div>
    </div>
  );
}
