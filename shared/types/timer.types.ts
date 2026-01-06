/**
 * @file timer.types.ts
 * @description 计时器核心类型定义
 * @created 2025-11-02
 */

/**
 * 计时器任务核心接口
 * 
 * @property id - 任务唯一标识符
 * @property name - 任务名称
 * @property categoryPath - 分类路径（如 "工作/开发"）
 * @property instanceTag - 事物项标签（可选）
 * @property elapsedTime - 已耗时（秒）
 * @property initialTime - 初始时间（秒）
 * @property isRunning - 是否运行中
 * @property startTime - 开始时间戳（秒）
 * @property isPaused - 是否暂停
 * @property pausedTime - 暂停时累计时间（秒）
 * @property parentId - 父任务ID（用于子任务）
 * @property children - 子任务列表
 * @property totalTime - 包含子任务的总时间
 * @property order - 排序字段（数值越小越靠前）
 * @property version - 乐观锁版本号
 * @property createdAt - 创建时间
 * @property updatedAt - 更新时间
 */
export interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  instanceTag?: string | null;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  totalTime?: number;
  order?: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
  // 新增：多标签支持
  instanceTags?: { instanceTag: { name: string } }[];
}

/**
 * 分类分组接口
 * 
 * @property id - 唯一标识符（用于 React key）
 * @property categoryPath - 分类路径（如 "工作/开发"）
 * @property categoryName - 当前层级名称（如 "工作"）
 * @property displayName - 显示名称（从路径提取）
 * @property level - 层级 (1, 2, 3)
 * @property tasks - 该分类下的直接任务
 * @property subGroups - 子分组（嵌套结构）
 * @property totalTime - 分类总时间
 * @property runningCount - 运行中的任务数
 * @property isCollapsed - 是否折叠
 * @property color - 区域主题色（仅一级分类）
 */
export interface CategoryGroup {
  id: string;
  categoryPath: string;
  categoryName: string;
  displayName: string;
  level: number;
  tasks: TimerTask[];
  subGroups?: CategoryGroup[];
  totalTime: number;
  runningCount: number;
  isCollapsed: boolean;
  color?: string;
}

/**
 * 任务操作回调接口
 */
export interface TimerCallbacks {
  /** 启动任务回调 */
  onStart?: (taskId: string) => void;
  /** 暂停任务回调 */
  onPause?: (taskId: string) => void;
  /** 停止任务回调 */
  onStop?: (taskId: string) => void;
  /** 任务变更回调 */
  onChange?: (tasks: TimerTask[]) => void;
  /** 版本冲突回调 */
  onVersionConflict?: () => void;
  /** 互斥暂停任务回调 */
  onTasksPaused?: (pausedTasks: Array<{ id: string; name: string }>) => void;
  /** 操作记录回调 */
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
  /** 任务复制回调 */
  onTaskClone?: (task: TimerTask) => void;
  /** 操作前回调 */
  onBeforeOperation?: () => void;
}

/**
 * 计时器控制器接口
 */
export interface TimerControl {
  /** 启动任务 */
  startTimer: (taskId: string) => Promise<void>;
  /** 暂停任务 */
  pauseTimer: (taskId: string) => Promise<void>;
  /** 停止任务 */
  stopTimer: (taskId: string) => Promise<void>;
  /** 是否正在处理操作 */
  isProcessing: boolean;
  /** 查找任务 */
  findTaskById: (taskId: string, taskList?: TimerTask[]) => TimerTask | null;
  /** 获取运行中的任务 */
  getRunningTasks: (taskList?: TimerTask[]) => TimerTask[];
}

/**
 * 快速创建任务数据
 */
export interface QuickCreateData {
  name: string;
  categoryPath: string;
  instanceTagNames: string[]; // 明确改为字符串数组
  instanceTag?: string | null; // 保留用于兼容
  initialTime: string;
  autoStart?: boolean;
}

