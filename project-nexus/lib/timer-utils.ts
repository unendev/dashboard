/**
 * 计时器工具函数
 * 包含：分组逻辑、折叠状态持久化、颜色生成等
 */

import { migrateLegacyCategory, formatCategoryDisplay } from './category-utils';
import { TimerTask, CategoryGroup } from '@dashboard/shared';
export type { TimerTask, CategoryGroup };



/**
 * 按 categoryPath 分组任务（支持3层嵌套）
 * 
 * @example
 * "工作/资产/test" → 工作(level=1) > 资产(level=2) > test任务
 * "工作/职业/test" → 工作(level=1) > 职业(level=2) > test任务
 */
export function groupTasksByCategory(tasks: TimerTask[]): CategoryGroup[] {
  // 只处理顶层任务（无父级）
  const topLevelTasks = tasks.filter(t => !t.parentId);

  // 排除特殊分类（休闲娱乐、身体蓄能）
  const tasksToGroup = topLevelTasks.filter(t =>
    !t.categoryPath?.includes('🎮 休闲娱乐') &&
    !t.categoryPath?.includes('⚡ 身体蓄能')
  );

  // 按一级分类分组
  const level1Map = new Map<string, TimerTask[]>();

  tasksToGroup.forEach(task => {
    const parts = (task.categoryPath || '未分类').split('/');
    const level1 = parts[0] || '未分类';

    const list = level1Map.get(level1) || [];
    list.push(task);
    level1Map.set(level1, list);
  });

  // 构建嵌套结构
  const groups: CategoryGroup[] = [];

  // 颜色池（与 CategoryZoneHeader 对应）
  const colors = ['blue', 'green', 'purple', 'red', 'orange', 'indigo'];
  let colorIndex = 0;

  level1Map.forEach((level1Tasks, level1Name) => {
    // 按二级分类分组
    const level2Map = new Map<string, TimerTask[]>();

    level1Tasks.forEach(task => {
      const parts = task.categoryPath.split('/');
      const level2 = parts.length >= 2 ? parts[1] : ''; // 空字符串表示直接在一级下

      const list = level2Map.get(level2) || [];
      list.push(task);
      level2Map.set(level2, list);
    });

    // 如果所有任务都是2层或更少，直接创建一级分组
    const hasMultipleLevels = level1Tasks.some(t => t.categoryPath.split('/').length >= 2);

    if (!hasMultipleLevels) {
      // 单层结构：直接创建一级分组
      groups.push({
        id: `cat-${level1Name}`,
        categoryPath: level1Name,
        categoryName: level1Name,
        displayName: level1Name,
        level: 1,
        tasks: sortTasks(level1Tasks),
        totalTime: calculateGroupTotalTime(level1Tasks),
        runningCount: countRunningTasks(level1Tasks),
        isCollapsed: false,
        color: colors[colorIndex % colors.length]
      });
      colorIndex++;
    } else {
      // 多层结构：创建嵌套分组
      const subGroups: CategoryGroup[] = [];

      level2Map.forEach((level2Tasks, level2Name) => {
        if (level2Name === '') {
          // 直接在一级分类下的任务（没有二级）
          // 这些任务放在一级的 tasks 里
          return;
        }

        // 按三级分类分组
        const level3Map = new Map<string, TimerTask[]>();

        level2Tasks.forEach(task => {
          const parts = task.categoryPath.split('/');
          const level3 = parts.length >= 3 ? parts[2] : ''; // 空表示直接在二级下

          const list = level3Map.get(level3) || [];
          list.push(task);
          level3Map.set(level3, list);
        });

        // 检查是否有第三层
        const hasLevel3 = level2Tasks.some(t => t.categoryPath.split('/').length >= 3);

        if (!hasLevel3) {
          // 没有第三层，二级直接包含任务
          subGroups.push({
            id: `cat-${level1Name}-${level2Name}`,
            categoryPath: `${level1Name}/${level2Name}`,
            categoryName: level2Name,
            displayName: level2Name,
            level: 2,
            tasks: sortTasks(level2Tasks),
            totalTime: calculateGroupTotalTime(level2Tasks),
            runningCount: countRunningTasks(level2Tasks),
            isCollapsed: false
          });
        } else {
          // 有第三层，创建嵌套
          const level3Groups: CategoryGroup[] = [];
          const level2DirectTasks: TimerTask[] = []; // 直接在二级下的任务

          level3Map.forEach((level3Tasks, level3Name) => {
            if (level3Name === '') {
              // 这些是2层任务，应该直接显示在二级下
              level2DirectTasks.push(...level3Tasks);
            } else {
              // 真正的三级分类
              level3Groups.push({
                id: `cat-${level1Name}-${level2Name}-${level3Name}`,
                categoryPath: `${level1Name}/${level2Name}/${level3Name}`,
                categoryName: level3Name,
                displayName: level3Name,
                level: 3,
                tasks: sortTasks(level3Tasks),
                totalTime: calculateGroupTotalTime(level3Tasks),
                runningCount: countRunningTasks(level3Tasks),
                isCollapsed: false
              });
            }
          });

          subGroups.push({
            id: `cat-${level1Name}-${level2Name}`,
            categoryPath: `${level1Name}/${level2Name}`,
            categoryName: level2Name,
            displayName: level2Name,
            level: 2,
            tasks: sortTasks(level2DirectTasks), // 二级直接包含2层任务
            subGroups: level3Groups.length > 0 ? level3Groups : undefined,
            totalTime: calculateGroupTotalTime(level2Tasks),
            runningCount: countRunningTasks(level2Tasks),
            isCollapsed: false
          });
        }
      });

      // 提取直接在一级下的任务
      const level1DirectTasks = level2Map.get('') || [];

      groups.push({
        id: `cat-${level1Name}`,
        categoryPath: level1Name,
        categoryName: level1Name,
        displayName: level1Name,
        level: 1,
        tasks: sortTasks(level1DirectTasks), // 一级直接包含1层任务
        subGroups,
        totalTime: calculateGroupTotalTime(level1Tasks),
        runningCount: countRunningTasks(level1Tasks),
        isCollapsed: false,
        color: colors[colorIndex % colors.length]
      });
      colorIndex++;
    }
  });

  // 排序：运行中的在前，然后按总时间排序
  return groups.sort((a, b) => {
    if (a.runningCount > 0 && b.runningCount === 0) return -1;
    if (a.runningCount === 0 && b.runningCount > 0) return 1;
    return b.totalTime - a.totalTime;
  });
}

/**
 * 计算分组的总时间（包含所有子任务）
 */
function calculateGroupTotalTime(tasks: TimerTask[]): number {
  let total = 0;

  function sumTaskTime(task: TimerTask): number {
    let time = task.totalTime || task.elapsedTime || 0;
    if (task.children && task.children.length > 0) {
      time += task.children.reduce((sum, child) => sum + sumTaskTime(child), 0);
    }
    return time;
  }

  tasks.forEach(task => {
    total += sumTaskTime(task);
  });

  return total;
}

/**
 * 计算运行中的任务数量（包含所有子任务）
 */
function countRunningTasks(tasks: TimerTask[]): number {
  let count = 0;

  function countTask(task: TimerTask): void {
    if (task.isRunning && !task.isPaused) {
      count++;
    }
    if (task.children && task.children.length > 0) {
      task.children.forEach(child => countTask(child));
    }
  }

  tasks.forEach(task => countTask(task));

  return count;
}

/**
 * 提取显示名称
 */
function extractDisplayName(categoryPath: string): string {
  if (!categoryPath) return "未分类";
  const parts = categoryPath.split('/').filter(p => p.trim());
  return parts.length > 1 ? parts.join(' / ') : parts[0] || "未分类";
}

/**
 * 对任务进行排序
 */
function sortTasks(tasks: TimerTask[]): TimerTask[] {
  return [...tasks].sort((a, b) => {
    // 如果两个任务都有order字段且order >= 0，按order排序
    if (a.order !== undefined && b.order !== undefined && a.order >= 0 && b.order >= 0) {
      // 如果order相同，按createdAt降序排序（新任务在前）
      if (a.order === b.order) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.order - b.order;
    }
    // 如果只有一个有有效的order字段，有order的排在前面
    if (a.order !== undefined && a.order >= 0 && (b.order === undefined || b.order < 0)) {
      return -1;
    }
    if (b.order !== undefined && b.order >= 0 && (a.order === undefined || a.order < 0)) {
      return 1;
    }
    // 如果都没有有效的order字段，按创建时间降序排序（新任务在前）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * 生成分类颜色
 */
export function generateCategoryColor(categoryPath: string): string {
  const colorMap: Record<string, string> = {
    '🚀 核心产出': 'blue',
    '📈 自我复利': 'green',
    '🎮 休闲娱乐': 'purple',
    '🛠️ 运行成本': 'orange',
    '工作': 'blue',
    '娱乐': 'purple',
    '学习': 'green',
    '时间黑洞': 'red',
    '健康': 'teal',
    '生活': 'yellow',
    '运动': 'orange',
    '社交': 'pink',
    '阅读': 'indigo',
  };

  if (!categoryPath) return 'gray';

  const topCategory = categoryPath.split('/')[0];
  return colorMap[topCategory] || 'gray';
}

/**
 * 获取运行中的任务（递归查找）
 */
export function getRunningTasks(tasks: TimerTask[]): TimerTask[] {
  const running: TimerTask[] = [];

  function findRunning(taskList: TimerTask[]): void {
    taskList.forEach(task => {
      if (task.isRunning && !task.isPaused) {
        running.push(task);
      }
      if (task.children && task.children.length > 0) {
        findRunning(task.children);
      }
    });
  }

  findRunning(tasks);
  return running;
}

// ============ 折叠状态持久化 ============

const COLLAPSED_CATEGORIES_KEY = 'timer-collapsed-categories';

/**
 * 保存折叠状态
 */
export function saveCollapsedCategories(categories: Set<string>): void {
  try {
    localStorage.setItem(
      COLLAPSED_CATEGORIES_KEY,
      JSON.stringify(Array.from(categories))
    );
  } catch (error) {
    console.error('保存折叠状态失败:', error);
  }
}

/**
 * 加载折叠状态
 */
export function loadCollapsedCategories(): Set<string> {
  try {
    const saved = localStorage.getItem(COLLAPSED_CATEGORIES_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch (error) {
    console.error('加载折叠状态失败:', error);
    return new Set();
  }
}

// ============ 自动计时偏好持久化 ============

const AUTO_START_PREFERENCE_KEY = 'timer-auto-start-preference';

/**
 * 保存自动开始计时偏好
 */
export function saveAutoStartPreference(autoStart: boolean): void {
  try {
    localStorage.setItem(AUTO_START_PREFERENCE_KEY, JSON.stringify(autoStart));
  } catch (error) {
    console.error('保存自动计时偏好失败:', error);
  }
}

/**
 * 加载自动开始计时偏好
 */
export function loadAutoStartPreference(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_START_PREFERENCE_KEY);
    return saved ? JSON.parse(saved) : true; // 默认为 true
  } catch (error) {
    console.error('加载自动计时偏好失败:', error);
    return true;
  }
}

// ============ 时间格式化 ============

/**
 * 根据自定义的切分时间点（例如凌晨2点）获取给定日期的“有效日期”字符串 (YYYY-MM-DD)。
 *
 * @param inputDate 输入的日期对象。
 * @param cutoffHour 每日切分的小时数 (0-23)，默认为 2 (凌晨2点)。
 * @returns YYYY-MM-DD 格式的有效日期字符串。
 */
export function getEffectiveDateString(inputDate: Date, cutoffHour: number = 2): string {
  const date = new Date(inputDate); // 避免修改原始对象

  // 创建一个表示当天切分时间点的日期对象 (本地时区)
  const cutoffTimeToday = new Date(date);
  cutoffTimeToday.setHours(cutoffHour, 0, 0, 0);

  const effectiveDate = new Date(date);

  // 如果当前时间在切分时间点之前 (例如，00:00 到 01:59)，则属于前一天
  if (date.getTime() < cutoffTimeToday.getTime()) {
    effectiveDate.setDate(effectiveDate.getDate() - 1);
  }

  // 格式化为 YYYY-MM-DD (本地时区)
  const year = effectiveDate.getFullYear();
  const month = (effectiveDate.getMonth() + 1).toString().padStart(2, '0'); // 月份从0开始
  const day = effectiveDate.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

import { formatTime, parseTimeInput } from '@dashboard/shared';

// Re-export shared utils
export { formatTime };
export const parseTimeToSeconds = parseTimeInput; // Maintain backward compatibility alias

/**
 * 递归统计分组中的所有任务总数（包括子分组）
 * 
 * 优化说明：
 * - 使用迭代而非递归可避免深层嵌套时的栈溢出，但此处分组通常仅 3 层
 * - 当前递归深度浅，递归实现更易读、维护
 * 
 * @example
 * 如果一级分组有 2 个直接任务，子分组中有 5 个任务
 * countAllTasksRecursively(group) === 7
 */
export function countAllTasksRecursively(group: CategoryGroup): number {
  let count = group.tasks.length;

  if (group.subGroups && group.subGroups.length > 0) {
    group.subGroups.forEach(subGroup => {
      count += countAllTasksRecursively(subGroup);
    });
  }

  return count;
}

