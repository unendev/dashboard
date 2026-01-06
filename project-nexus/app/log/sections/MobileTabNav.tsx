'use client'

import React from 'react';

interface MobileTabNavProps {
  activeSection: 'timer' | 'notes' | 'stats' | 'ai';
  onChange: (section: 'timer' | 'notes' | 'stats' | 'ai') => void;
}

/**
 * 移动端底部标签导航
 * 
 * 用于在移动设备上切换不同的内容区域
 */
export function MobileTabNav({ activeSection, onChange }: MobileTabNavProps) {
  const tabs = [
    { key: 'timer' as const, icon: '⏱️', label: '计时器' },
    { key: 'notes' as const, icon: '📝', label: '笔记' },
    { key: 'stats' as const, icon: '📊', label: '统计' },
    { key: 'ai' as const, icon: '🤖', label: 'AI' },
  ];

  return (
    <div className="mb-6 bg-gray-800 rounded-lg p-1 border-2 border-gray-600 overflow-hidden">
      <div className="grid grid-cols-4 gap-1.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-2 py-2.5 rounded-md font-medium transition-all duration-200 ${
              activeSection === tab.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

