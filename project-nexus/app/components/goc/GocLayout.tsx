"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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

  // 移动端显示/隐藏仅由手势方向控制

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
        <div
          className="flex-1 relative overflow-hidden"
          onTouchStart={(e) => {
            if (e.touches.length !== 1) return;
            const t = e.touches[0];
            touchStartRef.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchMove={() => {}}
          onTouchEnd={(e) => {
            const start = touchStartRef.current;
            if (!start) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            touchStartRef.current = null;

            if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;

            const order: Array<'left' | 'middle' | 'right'> = ['left', 'middle', 'right'];
            const idx = order.indexOf(mobileActiveTab);
            if (dx < 0 && idx < order.length - 1) {
              setMobileActiveTab(order[idx + 1]);
            } else if (dx > 0 && idx > 0) {
              setMobileActiveTab(order[idx - 1]);
            }
          }}
        >
          <div className={cn("absolute inset-0 overflow-hidden transition-opacity duration-300", mobileActiveTab === 'left' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
            {left}
          </div>
          <div className={cn("absolute inset-0 overflow-hidden transition-opacity duration-300", mobileActiveTab === 'middle' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
            {middle}
          </div>
          <div className={cn("absolute inset-0 overflow-hidden transition-opacity duration-300", mobileActiveTab === 'right' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
            {right}
          </div>

          {/* 手势切换：左右滑动 */}
        </div>
      </div>
    </div>
  );
}
