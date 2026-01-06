'use client';

import React, { useState, useEffect } from 'react';
import { useDevSession } from '../hooks/useDevSession';
import MilestoneCard from '../components/features/milestone/MilestoneCard';
import type { MilestoneData } from '@/types/milestone';

export default function ProgressPage() {
  const { data: session, status } = useDevSession();
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      loadMilestones();
    }
  }, [status]);

  const loadMilestones = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/milestones?limit=20');

      if (!response.ok) {
        throw new Error('加载里程碑失败');
      }

      const data = await response.json();
      setMilestones(data.milestones || []);
    } catch (err) {
      console.error('Error loading milestones:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="w-full container-padding container-padding-y space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">🏛️ 人生阁</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="w-full container-padding container-padding-y space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">🏛️ 人生阁</h1>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">请先登录以查看你的成长轨迹</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 md:px-8 lg:px-10 xl:px-12 py-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">🏛️ 人生阁</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">回顾你的成长轨迹</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={loadMilestones}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            重试
          </button>
        </div>
      )}

      {/* 里程碑列表 */}
      {milestones.length === 0 && !error ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            还没有里程碑记录
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            去 /log 页面创建你的第一个每周回顾吧！
          </p>
          <a
            href="/log"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            前往日志页面
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 时间线 */}
          <div className="relative">
            {/* 垂直线 */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#3d3d3d]"></div>

            {/* 里程碑卡片 */}
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="relative pl-16">
                  {/* 时间点 */}
                  <div className="absolute left-5 top-6 w-6 h-6 bg-blue-600 rounded-full border-4 border-white dark:border-gray-900 shadow-lg"></div>

                  {/* 卡片 */}
                  <MilestoneCard milestone={milestone} />
                </div>
              ))}
            </div>
          </div>

          {/* 底部提示 */}
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
            已显示全部 {milestones.length} 条记录
          </div>
        </div>
      )}
    </div>
  );
}
