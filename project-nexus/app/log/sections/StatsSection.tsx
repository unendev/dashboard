'use client'

import React from 'react';
import Link from 'next/link';
import DateRangePicker, { DateRangeValue } from '@/app/components/shared/DateRangePicker';
import TimeStatsChart from '@/app/components/shared/TimeStatsChart';
import CollapsibleAISummary from '@/app/components/shared/CollapsibleAISummary';
import LazyLoadWrapper from '@/app/components/shared/LazyLoadWrapper';
import { TimerTask } from '@/app/features/timer/types';

interface StatsSectionProps {
  // 数据
  userId: string;
  tasks: TimerTask[];
  dateRange: DateRangeValue;
  
  // 布局模式
  mode: 'desktop' | 'mobile-stats' | 'mobile-ai';
  className?: string;
  
  // 回调
  onDateRangeChange: (range: DateRangeValue) => void;
  onOpenDailyProgress: () => void;
  onOpenTreasure: (type: 'TEXT' | 'IMAGE') => void;
}

/**
 * 统计区域组件
 * 
 * 支持三种显示模式：
 * - desktop: 桌面端完整显示（统计 + AI）
 * - mobile-stats: 移动端统计标签页
 * - mobile-ai: 移动端 AI 标签页
 */
export function StatsSection({
  userId,
  tasks,
  dateRange,
  mode,
  className = '',
  onDateRangeChange,
  onOpenDailyProgress,
  onOpenTreasure,
}: StatsSectionProps) {
  const showStats = mode === 'desktop' || mode === 'mobile-stats';
  const showAI = mode === 'desktop' || mode === 'mobile-ai';
  
  // 桌面端：在头部显示昨日进度和人生阁按钮
  const desktopActions = mode === 'desktop' && (
    <div className="flex items-center justify-end gap-3 mb-6 flex-wrap">
      <button
        onClick={onOpenDailyProgress}
        className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-colors flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
      >
        <span className="text-lg md:text-xl">📊</span>
        <span className="hidden sm:inline">昨日进度</span>
        <span className="sm:hidden">进度</span>
      </button>
      <Link
        href="/progress"
        className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-colors flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
      >
        <span className="text-lg md:text-xl">🏛️</span>
        <span className="hidden sm:inline">人生阁</span>
        <span className="sm:hidden">阁</span>
      </Link>
    </div>
  );

  return (
    <>
      {desktopActions}
      
      <section className={`${mode === 'desktop' ? 'border-t border-gray-700/50 pt-6 px-0' : 'px-4 py-6 mb-6'} ${className}`}>
        {/* 标题与日期选择器 */}
        <div className={`mb-6 pb-4 ${mode === 'desktop' ? 'border-b border-gray-700/50 px-4 md:px-6' : 'border-b-2 border-gray-600'}`}>
          <div className={mode === 'desktop' ? 'flex flex-col gap-4 md:flex-row md:items-center md:justify-between' : ''}>
            <h2 className={`${mode === 'desktop' ? 'text-2xl' : 'text-2xl'} font-bold text-white ${mode !== 'desktop' ? 'mb-4' : ''} flex items-center gap-3`}>
              <span className="text-3xl">📊</span>
              数据分析
            </h2>
            
            {/* 时间段选择器 */}
            <div className={mode === 'desktop' ? 'w-full md:w-auto' : ''}>
              <DateRangePicker 
                value={dateRange}
                onChange={onDateRangeChange}
              />
            </div>
          </div>
        </div>
        
        {/* 时间统计 */}
        {showStats && (
          <div className={`${mode === 'desktop' ? 'mb-8 px-4 md:px-6' : 'mb-6'}`}>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span>
              时间统计
            </h3>
            <LazyLoadWrapper placeholderHeight="400px">
              <TimeStatsChart tasks={tasks} userId={userId} dateRange={dateRange} />
            </LazyLoadWrapper>
          </div>
        )}
        
        {/* AI智能总结 */}
        {showAI && (
          <div className={mode === 'desktop' ? 'px-4 md:px-6' : ''}>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              AI智能总结
            </h3>
            <LazyLoadWrapper placeholderHeight="200px">
              <CollapsibleAISummary 
                userId={userId}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
              />
            </LazyLoadWrapper>
          </div>
        )}
      </section>
    </>
  );
}





