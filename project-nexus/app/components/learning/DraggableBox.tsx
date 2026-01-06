"use client";

import { useState, useRef, useEffect, ReactNode } from 'react';

interface DraggableBoxProps {
  title: string;
  initialX?: number;
  initialY?: number;
  width?: number;
  height?: number;
  children: ReactNode;
  visible?: boolean;
  onClose?: () => void;
}

export function DraggableBox({ 
  title, 
  initialX = 20, 
  initialY = 20, 
  width = 320, 
  height = 400,
  children,
  visible = true,
  onClose
}: DraggableBoxProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  // Constraints for dragging within viewport
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={boxRef}
      style={{
        left: position.x,
        top: position.y,
        width: width,
        maxHeight: isMinimized ? 'auto' : height,
        zIndex: 50,
      }}
      className="fixed flex flex-col bg-black/60 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden text-gray-100 transition-opacity duration-200"
    >
      {/* Header Bar - Draggable Area */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5 cursor-move select-none hover:bg-white/10 transition-colors"
      >
        <h3 className="font-semibold text-sm tracking-wide">{title}</h3>
        <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded text-xs text-gray-400 hover:text-white"
          >
            {isMinimized ? '□' : '_'}
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-xs text-gray-400"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {!isMinimized && (
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {children}
        </div>
      )}
    </div>
  );
}
