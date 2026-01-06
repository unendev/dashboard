'use client';

import React, { useState } from 'react';
import type { MilestoneData, ConfirmedAchievement } from '@/types/milestone';

interface MilestoneCardProps {
  milestone: MilestoneData;
}

export default function MilestoneCard({ milestone }: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const confirmedAchievements = (Array.isArray(milestone.confirmedAchievements)
    ? milestone.confirmedAchievements
    : []) as unknown as ConfirmedAchievement[];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700">
      {/* 顶部 - 日期和标题 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {formatDate(milestone.startDate)} ~ {formatDate(milestone.endDate)}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {milestone.aiTitle}
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* 焦点摘要 */}
      <div className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
        {milestone.aiFocus}
      </div>

      {/* 成果数量概览 */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center text-green-600 dark:text-green-400">
          <span className="font-semibold">{confirmedAchievements.length}</span>
          <span className="ml-1">个成果</span>
        </div>
        {milestone.aiInsights && milestone.aiInsights.length > 0 && (
          <div className="flex items-center text-blue-600 dark:text-blue-400">
            <span className="font-semibold">{milestone.aiInsights.length}</span>
            <span className="ml-1">条洞察</span>
          </div>
        )}
      </div>

      {/* 展开详情 */}
      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* 完整焦点 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              💡 本周焦点
            </h4>
            <p className="text-gray-700 dark:text-gray-300">{milestone.aiFocus}</p>
          </div>

          {/* 确认的成果列表 */}
          {confirmedAchievements.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                🎯 关键成果
              </h4>
              <ul className="space-y-2">
                {confirmedAchievements.map((achievement, index) => (
                  <li
                    key={index}
                    className="flex items-start text-sm bg-gray-50 dark:bg-gray-700/50 rounded p-2"
                  >
                    <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                    <div className="flex-1">
                      <div className="text-gray-900 dark:text-gray-100 font-medium">
                        {achievement.taskName}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                        {achievement.duration ? formatDuration(achievement.duration) : '未知时长'} • {achievement.categoryPath || '未知分类'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI 洞察 */}
          {milestone.aiInsights && milestone.aiInsights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                ✨ AI 洞察
              </h4>
              <ul className="space-y-1">
                {milestone.aiInsights.map((insight, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 用户备注 */}
          {milestone.userNotes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                💭 我的感想
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">{milestone.userNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}







