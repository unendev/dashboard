'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { safeFetchJSON, safePostJSON } from '@/lib/fetch-utils';

interface AISummary {
  summary: string;
  totalTime: number;
  taskCount: number;
  insights: string[];
  categories: Record<string, number>;
  isFromCache?: boolean;
  needsGeneration?: boolean;
}

interface CollapsibleAISummaryProps {
  userId?: string;
  startDate?: string;
  endDate?: string;
}

const CollapsibleAISummary: React.FC<CollapsibleAISummaryProps> = ({ 
  userId = 'user-1', 
  startDate = '',
  endDate = ''
}) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开

  // 解析可能包含JSON代码块的summary文本
  const parseSummaryText = (text: string): { summary: string; insights: string[] } => {
    // 检测```json...```格式
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1]);
        return {
          summary: parsed.summary || text,
          insights: Array.isArray(parsed.insights) ? parsed.insights : []
        };
      } catch {
        // JSON解析失败，返回原文本
      }
    }
    
    // 尝试直接解析为JSON
    try {
      const parsed = JSON.parse(text);
      return {
        summary: parsed.summary || text,
        insights: Array.isArray(parsed.insights) ? parsed.insights : []
      };
    } catch {
      // 不是JSON，返回原文本
      return { summary: text, insights: [] };
    }
  };

  const fetchSummary = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await safeFetchJSON<AISummary>(
        `/api/ai-summary?userId=${userId}&startDate=${startDate}&endDate=${endDate}`,
        {},
        0
      );
      
      // 如果summary是字符串，尝试解析
      if (typeof data.summary === 'string') {
        const parsed = parseSummaryText(data.summary);
        data.summary = parsed.summary;
        if (parsed.insights.length > 0 && (!data.insights || data.insights.length === 0)) {
          data.insights = parsed.insights;
        }
      }
      
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  const generateSummary = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await safePostJSON<AISummary>('/api/ai-summary', { 
        userId, 
        startDate, 
        endDate 
      }, 0);
      
      // 如果summary是字符串，尝试解析
      if (typeof data.summary === 'string') {
        const parsed = parseSummaryText(data.summary);
        data.summary = parsed.summary;
        if (parsed.insights.length > 0 && (!data.insights || data.insights.length === 0)) {
          data.insights = parsed.insights;
        }
      }
      
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchSummary();
    }
  }, [fetchSummary]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  // 如果正在加载且没有数据
  if (loading && !summary) {
    return (
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-700/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          🤖 时间段总结
          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full">加载中...</span>
        </h3>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  // 如果有错误
  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-700/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          🤖 时间段总结
          <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded-full">错误</span>
        </h3>
        <div className="text-center py-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={generateSummary}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            重新生成
          </button>
        </div>
      </div>
    );
  }

  // 如果没有总结数据或需要生成
  if ((!summary && !loading) || (summary && summary.needsGeneration)) {
    return (
      <div className="bg-gradient-to-r from-gray-900/30 to-slate-900/30 border border-gray-700/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          🤖 时间段总结
          <span className="text-xs bg-gray-800/50 text-gray-400 px-2 py-1 rounded-full">未生成</span>
        </h3>
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm mb-3">
            {summary?.needsGeneration 
              ? "AI总结尚未生成，点击按钮手动生成" 
              : "点击按钮生成时间段AI总结"
            }
          </p>
          <button
            onClick={generateSummary}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '生成中...' : '生成总结'}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            定时任务会在每天凌晨自动生成前一天的总结
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/30 rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer mb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">🤖 时间段总结</h3>
          <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">
            {summary?.isFromCache ? '已缓存' : '实时生成'}
          </span>
        </div>
        <span className={`text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      
      {/* 折叠时显示的核心信息 */}
      {!isExpanded && summary && (
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-green-700/30">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">
                {formatTime(summary.totalTime)}
              </div>
              <div className="text-xs text-gray-400">总工作时间</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">
                {summary.taskCount}
              </div>
              <div className="text-xs text-gray-400">任务数量</div>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            点击展开查看详细分析
          </div>
        </div>
      )}

      {/* 展开时显示的详细信息 */}
      {isExpanded && summary && (
        <div className="space-y-4">
          {/* 主要总结 */}
          <div className="bg-gray-800/50 rounded-lg p-3 border border-green-700/30">
            <p className="text-gray-200 text-sm leading-relaxed">{summary.summary}</p>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-gray-800/50 rounded-lg p-2 border border-green-700/30">
              <div className="text-lg font-bold text-blue-400">
                {formatTime(summary.totalTime)}
              </div>
              <div className="text-xs text-gray-400">总工作时间</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-lg p-2 border border-green-700/30">
              <div className="text-lg font-bold text-green-400">
                {summary.taskCount}
              </div>
              <div className="text-xs text-gray-400">任务数量</div>
            </div>
          </div>

          {/* AI 洞察 */}
          {summary.insights && summary.insights.length > 0 && (
            <div>
              <h4 className="text-gray-200 font-medium mb-2 text-sm">💡 AI 洞察</h4>
              <div className="space-y-1">
                {summary.insights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start space-x-2 bg-gray-800/50 rounded-lg p-2 border border-green-700/30">
                    <span className="text-blue-400 text-xs mt-0.5">•</span>
                    <p className="text-gray-300 text-xs">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 重新生成按钮 */}
          <div className="text-center">
            <button
              onClick={generateSummary}
              className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition-colors"
            >
              重新生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleAISummary;



