'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

interface InstanceStat {
  instanceTag: string;
  totalTime: number;
  taskCount: number;
}

interface InstanceStatsResponse {
  stats: InstanceStat[];
  period: string;
  totalInstances: number;
}

const InstanceStatsView: React.FC = () => {
  const [stats, setStats] = useState<InstanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('today');
  const [periodLabel, setPeriodLabel] = useState('今天');

  // 获取时间范围
  const getDateRange = React.useCallback((period: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (period) {
      case 'today':
        return { startDate: todayStr, endDate: todayStr };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { 
          startDate: weekStart.toISOString().split('T')[0], 
          endDate: todayStr 
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { 
          startDate: monthStart.toISOString().split('T')[0], 
          endDate: todayStr 
        };
      case 'all':
        return { startDate: undefined, endDate: undefined };
      default:
        return { startDate: todayStr, endDate: todayStr };
    }
  }, []);

  // 获取实例统计
  const fetchInstanceStats = React.useCallback(async (period: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRange(period);
      const params = new URLSearchParams({
        userId: 'user-1'
      });
      
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/timer-tasks/stats/by-instance?${params}`);
      
      if (!response.ok) {
        throw new Error('获取实例统计失败');
      }
      
      const data: InstanceStatsResponse = await response.json();
      setStats(data.stats);
      setPeriodLabel(data.period);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // 计算百分比
  const getPercentage = (time: number) => {
    if (stats.length === 0) return 0;
    const totalTime = stats.reduce((sum, stat) => sum + stat.totalTime, 0);
    return totalTime > 0 ? (time / totalTime) * 100 : 0;
  };

  // 处理时间段变化
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    fetchInstanceStats(newPeriod);
  };

  // 初始加载
  useEffect(() => {
    fetchInstanceStats(period);
  }, [period, fetchInstanceStats]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>实例标签统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>实例标签统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={() => fetchInstanceStats(period)}>
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>实例标签统计</CardTitle>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今天</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="all">全部</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-gray-500">
          {periodLabel} • 共 {stats.length} 个实例标签
        </p>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无实例标签数据
          </div>
        ) : (
          <div className="space-y-4">
            {stats.map((stat) => (
              <div key={stat.instanceTag} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {stat.instanceTag}
                    </span>
                    <span className="text-xs text-gray-500">
                      {stat.taskCount} 个任务
                    </span>
                  </div>
                  <div className="text-sm font-mono text-gray-700">
                    {formatTime(stat.totalTime)}
                  </div>
                </div>
                
                {/* 进度条 */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getPercentage(stat.totalTime)}%` }}
                  />
                </div>
                
                {/* 百分比 */}
                <div className="text-xs text-gray-500 text-right">
                  {getPercentage(stat.totalTime).toFixed(1)}%
                </div>
              </div>
            ))}
            
            {/* 总计 */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">总计</span>
                <span className="font-mono text-lg text-blue-600">
                  {formatTime(stats.reduce((sum, stat) => sum + stat.totalTime, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InstanceStatsView;



