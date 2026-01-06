'use client'

import React, { useState, useEffect } from 'react';

/**
 * 隐私幕布组件 (简化版)
 * 
 * 功能：
 * 1. 左下角扇形区域点击 -> 切换模糊模式 (Blur Mode)
 * 2. Esc 键 -> 切换模糊模式
 * 3. 模糊模式下不妨碍点击 (pointer-events-none)
 */
export function PrivacyLayer() {
  const [isBlurred, setIsBlurred] = useState(false);

  // 键盘监听 & Body Class 切换
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBlurred(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // 切换 Body Class
    if (isBlurred) {
      document.body.classList.add('privacy-blur-text-mode');
    } else {
      document.body.classList.remove('privacy-blur-text-mode');
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('privacy-blur-text-mode');
    };
  }, [isBlurred]);

  return (
    <>
      {/* 隐形触发区 - 左下角 (模糊) - 1/4 圆扇形 */}
      <div 
        className="fixed bottom-0 left-0 w-24 h-24 md:w-40 md:h-40 z-[9000] cursor-pointer group"
        onClick={() => setIsBlurred(prev => !prev)}
        title="切换文字模糊模式 (Esc)"
      >
        {/* 视觉层：hover 时显示扇形 */}
        <div className="absolute bottom-0 left-0 w-full h-full bg-white/0 group-hover:bg-white/10 transition-colors duration-300 rounded-tr-[100%]" />
      </div>

      {/* 状态指示器 (仅在左下角显示微弱光点，提示模式开启) */}
      {isBlurred && (
        <div className="fixed bottom-4 left-4 w-3 h-3 rounded-full bg-orange-500/50 blur-[2px] z-[9001] pointer-events-none animate-pulse" />
      )}
    </>
  );
}
