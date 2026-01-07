'use client'

import React from 'react';
import ReactECharts from 'echarts-for-react';
import InstanceTagSelector from './InstanceTagSelector';
import { DateRangeValue } from './DateRangePicker';
import { TimerTask } from '@dashboard/shared';



interface EChartsSunburstChartProps {
  tasks: TimerTask[];
  // 第三层展示配置（可选）
  detailTopN?: number;           // 每个二级分类展示前 N 个任务
  detailMinPercent?: number;     // 每个二级分类展示占比 >= 此阈值的任务（0-1）
  minLeafSeconds?: number;       // 每个二级分类展示时长 >= 此秒数的任务
  showAllLeaf?: boolean;         // 是否强制展示所有叶子（为 true 时忽略聚合）
  userId?: string;               // 用户ID（用于事务项总时长统计）
  dateRange?: DateRangeValue;
}

interface TaskDetail {
  id: string;
  name: string;
  elapsedTime: number;
  categoryPath: string;
}

const EChartsSunburstChart: React.FC<EChartsSunburstChartProps> = ({
  tasks,
  detailTopN = 5,
  detailMinPercent = 0.1,
  minLeafSeconds = 600,
  showAllLeaf = false,
  userId = 'user-1',
  dateRange
}) => {
  // 视图模式：按分类（使用传入 tasks），或按事务项（全量总时长）
  const [viewMode, setViewMode] = React.useState<'category' | 'instance'>('category');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [taskDetails, setTaskDetails] = React.useState<TaskDetail[]>([]);
  const [showTaskList, setShowTaskList] = React.useState(true); // 默认显示任务列表
  const [isTaskListExpanded, setIsTaskListExpanded] = React.useState(false); // 默认折叠，只显示前5条

  // 递归计算任务的总时间（包括子任务）
  const calculateTotalTime = React.useCallback((task: TimerTask): number => {
    let total = task.elapsedTime;
    if (task.children) {
      task.children.forEach(child => {
        total += calculateTotalTime(child);
      });
    }
    return total;
  }, []);

  // 初始化时设置默认的任务详情数据 - 显示所有任务按耗时时长排序（分类模式）
  React.useEffect(() => {
    if (tasks.length > 0) {
      // 过滤顶级任务，避免重复统计
      const topLevelTasks = tasks.filter(task => !task.parentId);

      // 获取所有任务并按耗时时长排序
      const allTasks: TaskDetail[] = [];
      topLevelTasks.forEach(task => {
        allTasks.push({
          id: task.id,
          name: task.name,
          elapsedTime: calculateTotalTime(task),
          categoryPath: task.categoryPath || '未分类'
        });
      });

      // 按耗时时长从高到低排序
      const sortedTasks = allTasks.sort((a, b) => b.elapsedTime - a.elapsedTime);
      setTaskDetails(sortedTasks);
      setSelectedCategory('所有任务');
    }
  }, [tasks, calculateTotalTime]);


  // 构建 分类 模式的 ECharts 旭日图数据（合并同名任务，支持"其他"聚合）
  const buildCategorySunburstData = React.useCallback(() => {
    // 定义聚合后的任务结构
    interface AggregatedTask {
      id: string; // 使用 name 作为聚合后的唯一ID
      name: string;
      elapsedTime: number;
      categoryPath: string;
    }

    // 过滤顶级任务
    const topLevelTasks = tasks.filter(task => !task.parentId);

    // 预聚合成两级分类结构: First -> Second -> Map<TaskName, AggregatedTask>
    const firstLevelMap = new Map<string, Map<string, Map<string, AggregatedTask>>>();

    topLevelTasks.forEach(task => {
      if (!task.name) return; // 忽略没有名称的任务

      const category = task.categoryPath || '未分类';
      const taskTotalTime = calculateTotalTime(task);
      const parts = category.split('/');
      const first = parts[0] || '未分类';
      const second = parts.length >= 2 ? parts[1] : '其他';

      const secondMap = firstLevelMap.get(first) || new Map<string, Map<string, AggregatedTask>>();
      const taskMap = secondMap.get(second) || new Map<string, AggregatedTask>();

      const existingTask = taskMap.get(task.name);
      if (existingTask) {
        existingTask.elapsedTime += taskTotalTime;
      } else {
        taskMap.set(task.name, {
          id: task.name, // 使用任务名称作为聚合后的ID
          name: task.name,
          elapsedTime: taskTotalTime,
          categoryPath: `${first}/${second}`
        });
      }
      secondMap.set(second, taskMap);
      firstLevelMap.set(first, secondMap);
    });

    interface SunburstNode {
      name: string;
      value: number;
      children: SunburstNode[];
      itemStyle?: { color: string; borderColor?: string }; // 允许定义边框颜色
      fullName?: string;
      taskId?: string;
      categoryPath?: string;
      isLeaf?: boolean;
      label?: { show: boolean }; // 允许隐藏标签
      emphasis?: { itemStyle?: { color: string } }; // 允许定义高亮样式
    }

    const root: SunburstNode = {
      name: '总时间',
      value: 0,
      children: [],
      // 【修改】让根节点完全透明且无交互
      itemStyle: {
        color: 'transparent',
        borderColor: 'transparent'
      },
      label: {
        show: false
      },
      emphasis: {
        itemStyle: {
          color: 'transparent'
        }
      }
    };
    const colors = [
      '#5470c6', '#91cc75', '#fac858', '#ee6666',
      '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
      '#ea7ccc', '#ff9f7f', '#ffdb5c', '#37a2da'
    ];
    let colorIndex = 0;

    firstLevelMap.forEach((secondMap, firstName) => {
      const firstNode: SunburstNode = { name: firstName, value: 0, children: [], itemStyle: { color: colors[colorIndex % colors.length] } };
      colorIndex++;

      secondMap.forEach((taskMap, secondName) => {
        const taskList = Array.from(taskMap.values()); // 从Map转换回数组以进行排序和筛选
        const totalCategoryTime = taskList.reduce((s, t) => s + t.elapsedTime, 0);

        let selected: AggregatedTask[] = [];
        if (showAllLeaf) {
          selected = [...taskList].sort((a, b) => b.elapsedTime - a.elapsedTime);
        } else {
          const sorted = [...taskList].sort((a, b) => b.elapsedTime - a.elapsedTime);
          const byTopN = sorted.slice(0, Math.max(0, detailTopN || 0));
          const byPercent = sorted.filter(t => totalCategoryTime > 0 && (t.elapsedTime / totalCategoryTime) >= (detailMinPercent || 0));
          const bySeconds = sorted.filter(t => t.elapsedTime >= (minLeafSeconds || 0));
          const mergedMap = new Map<string, AggregatedTask>();
          [...byTopN, ...byPercent, ...bySeconds].forEach(t => mergedMap.set(t.id, t));
          selected = Array.from(mergedMap.values()).sort((a, b) => b.elapsedTime - a.elapsedTime);
        }

        const selectedSum = selected.reduce((s, t) => s + t.elapsedTime, 0);
        const otherSum = Math.max(0, totalCategoryTime - selectedSum);

        const secondNode: SunburstNode = { name: secondName, value: 0, children: [], itemStyle: { color: colors[colorIndex % colors.length] } };
        colorIndex++;

        selected.forEach((t, idx) => {
          const truncated = t.name.length > 8 ? t.name.substring(0, 8) + '...' : t.name;
          secondNode.children.push({
            name: truncated,
            fullName: t.name,
            taskId: t.id,
            categoryPath: t.categoryPath,
            isLeaf: true,
            value: t.elapsedTime,
            children: [],
            itemStyle: { color: colors[(colorIndex + idx) % colors.length] }
          });
        });

        if (!showAllLeaf && selected.length > 0 && otherSum > 0) {
          secondNode.children.push({ name: '其他', value: otherSum, children: [], itemStyle: { color: colors[colorIndex % colors.length] } });
        }

        secondNode.value = secondNode.children.reduce((s, c) => s + c.value, 0);
        firstNode.children.push(secondNode);
      });

      firstNode.value = firstNode.children.reduce((s, c) => s + c.value, 0);
      root.children.push(firstNode);
    });

    root.value = root.children.reduce((s, c) => s + c.value, 0);
    if (root.value <= 0) root.value = 1;

    return root;
  }, [tasks, detailTopN, detailMinPercent, minLeafSeconds, showAllLeaf, calculateTotalTime]);

  // 事务项（总时长）统计
  interface InstanceStat { instanceTag: string; totalTime: number; taskCount: number }
  const [instanceStats, setInstanceStats] = React.useState<InstanceStat[]>([]);
  const [loadingInstance, setLoadingInstance] = React.useState(false);
  const [instanceError, setInstanceError] = React.useState<string | null>(null);
  const [selectedInstanceTags, setSelectedInstanceTags] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (viewMode !== 'instance') return;
    let aborted = false;
    (async () => {
      try {
        setLoadingInstance(true);
        setInstanceError(null);
        let url = `/api/timer-tasks/stats/by-instance?userId=${encodeURIComponent(userId)}`;
        if (dateRange?.startDate && dateRange?.endDate) {
          url += `&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (!aborted) {
          setInstanceStats(Array.isArray(json.stats) ? json.stats : []);
        }
      } catch {
        if (!aborted) setInstanceError('加载事务项统计失败');
      } finally {
        if (!aborted) setLoadingInstance(false);
      }
    })();
    return () => { aborted = true };
  }, [viewMode, userId, dateRange]);

  // 构建 事务项 模式的 ECharts 旭日图数据（根 → 叶：各事务项），支持选择过滤
  const buildInstanceSunburstData = React.useCallback(() => {
    interface SunburstNode {
      name: string;
      value: number;
      children: SunburstNode[];
      itemStyle?: { color: string; borderColor?: string };
      label?: { show: boolean };
      emphasis?: { itemStyle?: { color: string } };
    }
    const root: SunburstNode = {
      name: '总时间',
      value: 0,
      children: [],
      // 【修改】让根节点完全透明且无交互
      itemStyle: {
        color: 'transparent',
        borderColor: 'transparent'
      },
      label: {
        show: false
      },
      emphasis: {
        itemStyle: {
          color: 'transparent'
        }
      }
    };
    const filtered = selectedInstanceTags.length > 0
      ? instanceStats.filter(it => selectedInstanceTags.includes(it.instanceTag))
      : instanceStats;

    const children: SunburstNode[] = filtered.map((it) => ({
      name: it.instanceTag,
      value: it.totalTime,
      children: [],
    }));
    root.children = children;
    root.value = children.reduce((s, c) => s + c.value, 0) || 1;
    return root;
  }, [instanceStats, selectedInstanceTags]);

  const formatTime = React.useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes > 0 ? `${minutes}分钟` : ''}`;
    }
    return `${minutes}分钟`;
  }, []);

  const sunburstData = React.useMemo(() => {
    return viewMode === 'category' ? buildCategorySunburstData() : buildInstanceSunburstData();
  }, [viewMode, buildCategorySunburstData, buildInstanceSunburstData]);
  const totalSecondsAllTasks = React.useMemo(() => {
    if (viewMode === 'category') {
      return tasks.reduce((sum, task) => sum + calculateTotalTime(task), 0);
    }
    const filtered = selectedInstanceTags.length > 0
      ? instanceStats.filter(it => selectedInstanceTags.includes(it.instanceTag))
      : instanceStats;
    return filtered.reduce((s, it) => s + it.totalTime, 0);
  }, [viewMode, tasks, calculateTotalTime, instanceStats, selectedInstanceTags]);


  // ECharts 配置选项
  const option = React.useMemo(() => {
    const config = {
      series: [
        {
          type: 'sunburst',
          data: [sunburstData],
          radius: [0, '95%'],
          center: ['50%', '50%'],
          sort: 'desc',
          itemStyle: {
            borderWidth: 2,
            borderColor: '#ffffff'
          },
          label: {
            show: true,
            color: '#ffffff',
            fontSize: 12
          },
          emphasis: {
            focus: 'ancestor'
          }
        }
      ],
      tooltip: {
        trigger: 'item',
        formatter: (params: { name?: string; value?: number }) => {
          const name = params?.name || '';
          const value = params?.value || 0;
          return `${name}<br/>时间: ${formatTime(value)}`;
        }
      }
    };
    return config;
  }, [sunburstData, formatTime]);

  // 注释掉自定义点击处理，完全使用 ECharts 原生 nodeClick: 'zoomToNode'
  // const onChartClick = (params: { data?: { isLeaf?: boolean; name?: string }; name?: string; value?: number }) => {
  //   console.log('Chart clicked:', params);
  //   
  //   // 仅在叶子节点（任务项）触发自定义逻辑，其他节点由 ECharts 原生 nodeClick 处理
  //   if (params?.data?.isLeaf === true) {
  //     handleChartClick(params);
  //   }
  //   // 非叶子节点和中心圆点击由 nodeClick: 'zoomToNode' 自动处理
  // };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">暂无时间数据</p>
          <p className="text-sm text-gray-400 mt-2">开始计时后这里会显示统计图表</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 模式切换：分类 / 事务项（总时长） */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          className={`px-3 py-1 rounded-full text-sm border ${viewMode === 'category' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800/50 text-gray-300 border-gray-700/50'}`}
          onClick={() => setViewMode('category')}
        >
          按分类
        </button>
        <button
          className={`px-3 py-1 rounded-full text-sm border ${viewMode === 'instance' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800/50 text-gray-300 border-gray-700/50'}`}
          onClick={() => setViewMode('instance')}
        >
          按事务项（总时长）
        </button>
      </div>

      {viewMode === 'instance' && (
        <div className="mb-3">
          <InstanceTagSelector
            selectedTags={selectedInstanceTags}
            onTagsChange={setSelectedInstanceTags}
            userId={userId}
          />
        </div>
      )}

      {viewMode === 'instance' && loadingInstance && (
        <div className="text-center text-sm text-gray-500 mb-2">加载事务项统计...</div>
      )}
      {viewMode === 'instance' && instanceError && (
        <div className="text-center text-sm text-red-500 mb-2">{instanceError}</div>
      )}
      <ReactECharts
        ref={(e) => {
          if (e) {
            const chartInstance = e.getEchartsInstance();
            // 保存实例用于后续操作
            (window as unknown as Record<string, unknown>).__echartInstance = chartInstance;
          }
        }}
        option={option}
        style={{ height: '500px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        onEvents={{
          click: (params: unknown) => {
            const chartInstance = (window as {
              __echartInstance?: {
                getOption: () => { series: Array<{ data: Array<{ name: string }> }> };
                dispatchAction: (action: { type: string; targetNodeId?: string }) => void;
              }
            }).__echartInstance;
            if (!chartInstance) return;

            const paramsObj = params as { data?: { name?: string }; treePathInfo?: Array<{ name?: string }> };
            if (!paramsObj.data) {
              return;
            }

            // 获取当前的根节点名称
            const currentOption = chartInstance.getOption();
            const currentRootName = currentOption.series[0].data[0].name;

            // 如果点击的是当前的中心节点
            if (paramsObj.data.name === currentRootName) {
              // 检查是否有父节点可供返回
              const ancestors = paramsObj.treePathInfo;
              // treePathInfo 包含从根到当前节点的所有节点，最后一个是自己
              if (ancestors && ancestors.length > 1) {
                // 倒数第二个是父节点
                const parentNode = ancestors[ancestors.length - 2];
                chartInstance.dispatchAction({
                  type: 'sunburstRootToNode',
                  targetNodeId: parentNode.name
                });
              }
              // 如果没有父节点（即点击的是最顶层的"总时间"），则不执行任何操作
            } else {
              // 点击的是子节点，放大到该节点
              chartInstance.dispatchAction({
                type: 'sunburstRootToNode',
                targetNodeId: paramsObj.data.name || ''
              });
            }
          }
        }}
      />
      <div className="mt-4 text-sm text-gray-300 text-center">
        <p>点击扇形区域展开 · 点击中心圆返回上一级</p>
        <p className="text-xs text-gray-400 mt-1">总时间: {formatTime(totalSecondsAllTasks)}</p>
      </div>

      {/* 任务详情显示 */}
      {viewMode === 'category' && showTaskList && (
        <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-200">
              {selectedCategory === '所有任务' ? '任务时间统计（按耗时时长排序）' : `${selectedCategory} - 具体事物项`}
            </h3>
            <button
              onClick={() => setShowTaskList(false)}
              className="text-gray-400 hover:text-gray-200 text-sm"
            >
              ✕ 关闭
            </button>
          </div>

          {taskDetails.length > 0 ? (
            <div className="space-y-3">
              {(isTaskListExpanded ? taskDetails : taskDetails.slice(0, 5)).map((task) => (
                <div key={task.id} className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg border border-gray-700/30">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-200">{task.name}</h4>
                    <p className="text-sm text-gray-400">{task.categoryPath}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-400">
                      {formatTime(task.elapsedTime)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.round((task.elapsedTime / sunburstData.value) * 100)}%
                    </div>
                  </div>
                </div>
              ))}

              {/* 展开/收起按钮 */}
              {taskDetails.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setIsTaskListExpanded(!isTaskListExpanded)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {isTaskListExpanded ? '收起 ▲' : `展开更多 (${taskDetails.length - 5}条) ▼`}
                  </button>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-200">总计</span>
                  <span className="text-lg font-semibold text-green-400">
                    {formatTime(taskDetails.reduce((sum, task) => sum + task.elapsedTime, 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📝</div>
              <p>该分类下暂无具体事物项</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EChartsSunburstChart;



