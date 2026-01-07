/**
 * 计时器核心类型定义
 * 
 * 统一 Project Nexus (Web) 和 Timer Electron (App) 的数据结构
 */

/**
 * 计时器任务核心接口
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
    createdAt: string; // Mandatory to match legacy usage
    updatedAt: string; // Mandatory to match legacy usage
    date: string;       // Added from Project Nexus definition (YYYY-MM-DD)
    userId?: string;    // Added for multi-user support
    deviceId?: string;  // Added for sync

    // 新增：多标签支持
    instanceTagNames?: string[];
    instanceTags?: { instanceTag: { name: string } }[] | any[];

    // 完成时间 (from timer-storage)
    completedAt?: number;
}

/**
 * 分类分组接口
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
 * 计时器控制操作结果
 */
export type StartTimerResult =
    | { success: true }
    | { success: false; reason: 'version_conflict'; conflictTaskName?: string }
    | { success: false; reason: 'not_found' }
    | { success: false; reason: 'processing' }
    | { success: false; reason: 'error'; error: unknown };


/**
 * 计时器控制器接口
 */
export interface TimerControl {
    /** 启动任务 */
    startTimer: (taskId: string) => Promise<StartTimerResult | void>; // Updated signature
    /** 暂停任务 */
    pauseTimer: (taskId: string) => Promise<void>;
    /** 停止任务 */
    stopTimer: (taskId: string) => Promise<void>;
    /** 是否正在处理操作 */
    isProcessing: boolean;
    /** 查找任务 */
    findTaskById: (taskId: string, taskList?: TimerTask[]) => TimerTask | null;
    /** 获取运行中的任务 */
    // getRunningTasks: (taskList?: TimerTask[]) => TimerTask[]; // Removed as it's not always used
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
