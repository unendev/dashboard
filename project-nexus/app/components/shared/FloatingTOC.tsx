'use client';

import React, { useState, useEffect } from 'react';

interface TOCSection {
  id: string;
  title: string;
  icon?: string;
}

interface FloatingTOCProps {
  sections: TOCSection[];
  activeSection?: string;
  onSectionClick?: (sectionId: string) => void;
  className?: string;
}

/**
 * 悬浮大纲组件
 * 用于文章/报告的快速导航
 */
export const FloatingTOC: React.FC<FloatingTOCProps> = ({
  sections,
  activeSection,
  onSectionClick,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // 监听滚动，动态显示/隐藏
  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // 向下滚动时隐藏，向上滚动时显示
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSectionClick = (sectionId: string) => {
    if (onSectionClick) {
      onSectionClick(sectionId);
    }
  };

  return (
    <div
      className={`fixed right-4 top-24 z-50 transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${className}`}
    >
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden max-w-xs">
        {/* 头部 - 可折叠按钮 */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700/50 cursor-pointer hover:bg-gray-800/70 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📑</span>
            <span className="text-sm font-medium text-gray-200">目录导航</span>
          </div>
          <button
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label={isCollapsed ? '展开' : '收起'}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                isCollapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* 内容区 - 章节列表 */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isCollapsed ? 'max-h-0' : 'max-h-96'
          } overflow-hidden`}
        >
          <nav className="py-2">
            <ul className="space-y-1">
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <button
                      onClick={() => handleSectionClick(section.id)}
                      className={`w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {section.icon && (
                          <span className="text-base flex-shrink-0">
                            {section.icon}
                          </span>
                        )}
                        <span className="truncate">{section.title}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* 底部提示 */}
        {!isCollapsed && (
          <div className="px-4 py-2 bg-gray-800/30 border-t border-gray-700/50">
            <p className="text-xs text-gray-500 text-center">
              点击章节快速跳转
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingTOC;


