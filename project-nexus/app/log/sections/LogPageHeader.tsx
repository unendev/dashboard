'use client'

import React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { markManualLogout } from '@/app/hooks/useDevSession';
import { OperationRecord } from '../hooks/useLogPageState';

interface LogPageHeaderProps {
  userName?: string | null;
  userEmail?: string | null;
  onWeeklyReview: () => void;
  onCreateLog: () => void;
  operationHistory: OperationRecord[];
  isOperationHistoryExpanded: boolean;
  onToggleOperationHistory: () => void;
  operationHistoryRef: React.RefObject<HTMLDivElement | null>;
  // 日期选择器相关
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  showDatePicker?: boolean;
}

/**
 * 日志页面头部导航栏
 * 
 * 包含：
 * - 用户信息和登出
 * - 每周回顾按钮
 * - 创建事物按钮
 * - 操作记录下拉面板
 */
export function LogPageHeader({
  userName,
  userEmail,
  onWeeklyReview,
  onCreateLog,
  operationHistory,
  isOperationHistoryExpanded,
  onToggleOperationHistory,
  operationHistoryRef,
  selectedDate,
  onDateChange,
  showDatePicker = false,
}: LogPageHeaderProps) {
  const handleLogout = async () => {
    markManualLogout();
    await signOut({ redirect: false });
    window.location.href = '/auth/signin';
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex items-center justify-end gap-3 flex-wrap">
        {/* 用户信息 */}
        {userName || userEmail ? (
          <div className="flex items-center gap-1.5 md:gap-2 bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full px-2 md:px-3 py-1.5 md:py-2 shadow-sm text-xs md:text-sm">
            <span className="font-medium text-gray-200 truncate max-w-[80px] md:max-w-none">
              {userName || userEmail}
              {userEmail === 'dev@localhost.com' && (
                <span className="ml-1 text-xs text-yellow-400 hidden md:inline">(开发)</span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-200 text-xs md:text-sm"
              title="登出"
            >
              登出
            </button>
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full px-2 md:px-4 py-1.5 md:py-2 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5 text-xs md:text-sm"
          >
            <span className="font-medium text-gray-200">登录</span>
          </Link>
        )}

        {/* 每周回顾按钮 */}
        <button
          onClick={onWeeklyReview}
          className="hidden md:flex bg-blue-600 hover:bg-blue-500 border border-blue-500/50 rounded-lg px-3 md:px-4 py-1.5 md:py-2 transition-colors items-center gap-1.5 md:gap-2"
        >
          <span className="text-base md:text-lg">📊</span>
          <span className="text-xs md:text-sm font-medium text-white">每周回顾</span>
        </button>

        {/* 创建事物按钮 */}
        <button
          onClick={onCreateLog}
          className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full px-2 md:px-4 py-1.5 md:py-2 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1 md:gap-2"
        >
          <span className="text-base md:text-lg">✏️</span>
          <span className="text-xs md:text-sm font-medium text-gray-200">记录</span>
        </button>

        {/* 日期选择器（桌面端） */}
        {showDatePicker && selectedDate && onDateChange && (
          <div className="hidden md:flex items-center gap-2 bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-lg px-3 py-1.5 shadow-sm">
            <label className="text-sm text-gray-300">日期:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="border border-gray-600 bg-gray-800/80 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        {/* 操作记录按钮 */}
        <div className="relative hidden md:block" ref={operationHistoryRef}>
          <button
            onClick={onToggleOperationHistory}
            className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-full px-3 md:px-4 py-1.5 md:py-2 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5 md:gap-2"
          >
            <span className="text-base md:text-lg">📊</span>
            <span className="text-xs md:text-sm font-medium text-gray-200">记录</span>
            <span className={`text-xs transition-transform duration-200 ${isOperationHistoryExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {/* 操作记录下拉面板 */}
          {isOperationHistoryExpanded && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-lg p-4 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-200">操作记录</h3>
                <button 
                  onClick={onToggleOperationHistory}
                  className="text-gray-400 hover:text-gray-200 text-lg hover:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              {operationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl mb-2 block">📝</span>
                  <p className="text-gray-400 text-sm">暂无操作记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {operationHistory.slice(0, 8).map((operation) => (
                    <div key={operation.id} className="p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors border border-gray-700/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-blue-300 bg-blue-900/40 px-2 py-1 rounded-full">
                              {operation.action}
                            </span>
                            <span className="text-xs text-gray-300 truncate">{operation.taskName}</span>
                          </div>
                          {operation.details && (
                            <p className="text-xs text-gray-400 truncate">{operation.details}</p>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {new Date(operation.timestamp).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

