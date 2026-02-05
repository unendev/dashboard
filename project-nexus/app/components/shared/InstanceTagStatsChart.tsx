'use client'

import React from 'react';
import ReactECharts from 'echarts-for-react';
import { InstanceTagCache } from '@/lib/instance-tag-cache';
import { TimerTask } from '@dashboard/shared';

interface InstanceTag {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}



interface InstanceTagStatsChartProps {
  tasks: TimerTask[];
  topN?: number; // 展示前 N 个事务项
}

const InstanceTagStatsChart: React.FC<InstanceTagStatsChartProps> = ({ tasks, topN = 10 }) => {
  // 递归计算任务总时长
  const calculateTotalTime = React.useCallback((task: TimerTask): number => {
    let total = task.elapsedTime;
    if (task.children && task.children.length > 0) {
      for (const child of task.children) {
        total += calculateTotalTime(child);
      }
    }
    return total;
  }, []);

  // 可用事务项（来自缓存/本地存储）
  const [availableTags, setAvailableTags] = React.useState<{ id: string; name: string }[]>([]);

  React.useEffect(() => {
    // 优先读取内存缓存
    const inMemory = InstanceTagCache.getInstanceTags?.() || [];
    if (Array.isArray(inMemory) && inMemory.length > 0) {
      setAvailableTags(inMemory.map((t: InstanceTag) => ({ id: t.id, name: t.name })));
      return;
    }
    // 尝试从本地存储读取
    const fromStorage = InstanceTagCache.loadFromStorage?.();
    if (Array.isArray(fromStorage) && fromStorage.length > 0) {
      setAvailableTags(fromStorage.map((t: InstanceTag) => ({ id: t.id, name: t.name })));
    }
  }, []);

  // 聚合：每个事务项的总时长与任务计数
  const { seriesData, usedCount, totalSecondsAllUsed } = React.useMemo(() => {
    const usageMap = new Map<string, { totalSeconds: number; taskCount: number }>();

    const collect = (taskList: TimerTask[]) => {
      for (const task of taskList) {
        const seconds = calculateTotalTime(task);
        if (task.instanceTag && task.instanceTag.trim() !== '') {
          const key = task.instanceTag.trim();
          const current = usageMap.get(key) || { totalSeconds: 0, taskCount: 0 };
          usageMap.set(key, {
            totalSeconds: current.totalSeconds + seconds,
            taskCount: current.taskCount + 1
          });
        }
        if (task.children && task.children.length > 0) {
          collect(task.children);
        }
      }
    };

    collect(tasks);

    const sorted = Array.from(usageMap.entries())
      .map(([name, v]) => ({ name, totalSeconds: v.totalSeconds, taskCount: v.taskCount }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    const limited = sorted.slice(0, Math.max(1, topN));
    const totalSecondsAllUsed = sorted.reduce((s, it) => s + it.totalSeconds, 0);

    return {
      seriesData: limited,
      usedCount: sorted.length,
      totalSecondsAllUsed
    };
  }, [tasks, topN, calculateTotalTime]);

  const formatTime = React.useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
    }
    return `${minutes}m`;
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">🏷️</div>
          <p className="text-gray-500">暂无数据</p>
          <p className="text-sm text-gray-400 mt-1">开始计时后，这里会显示事务项统计</p>
        </div>
      </div>
    );
  }

  if (seriesData.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            已使用事务项：0 / 可用事务项：{availableTags.length}
          </div>
          <div className="text-sm text-gray-500">总计：0m</div>
        </div>
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-3xl mb-2">🗂️</div>
            <div className="text-gray-500">今日未使用任何事务项</div>
          </div>
        </div>
      </div>
    );
  }

  const names = seriesData.map(d => d.name);
  const values = seriesData.map(d => d.totalSeconds);

  const option = {
    grid: { left: 80, right: 24, top: 24, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatTime(value)
      }
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        formatter: (name: string) => name.length > 12 ? name.slice(0, 12) + '...' : name
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.name}<br/>时间：${formatTime(Number(p.value) || 0)}`;
      }
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: {
          color: '#60a5fa'
        },
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) => formatTime(p.value),
          color: '#374151'
        }
      }
    ]
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          已使用事务项：{usedCount} / 可用事务项：{availableTags.length}
        </div>
        <div className="text-sm text-gray-500">总计：{formatTime(totalSecondsAllUsed)}</div>
      </div>
      {/* @ts-ignore */}
      <ReactECharts
        option={option}
        style={{ height: Math.max(260, names.length * 28 + 80) + 'px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
};

export default InstanceTagStatsChart;





