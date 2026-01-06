export interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  completedAt?: number;
  date: string; // ISO date string
}

const STORAGE_KEY = 'timer-tasks';

export const TimerStorage = {
  // 获取所有任务
  getAllTasks: (): TimerTask[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load timer tasks:', error);
      return [];
    }
  },

  // 获取指定日期的任务
  getTasksByDate: (date: string): TimerTask[] => {
    const allTasks = TimerStorage.getAllTasks();
    return allTasks.filter(task => task.date === date);
  },

  // 保存所有任务
  saveAllTasks: (tasks: TimerTask[]): void => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save timer tasks:', error);
    }
  },

  // 添加新任务
  addTask: (task: TimerTask): void => {
    const tasks = TimerStorage.getAllTasks();
    tasks.push(task);
    TimerStorage.saveAllTasks(tasks);
  },

  // 更新任务
  updateTask: (taskId: string, updates: Partial<TimerTask>): void => {
    const tasks = TimerStorage.getAllTasks();
    const index = tasks.findIndex(task => task.id === taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      TimerStorage.saveAllTasks(tasks);
    }
  },

  // 删除任务
  deleteTask: (taskId: string): void => {
    const tasks = TimerStorage.getAllTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    TimerStorage.saveAllTasks(filteredTasks);
  },

  // 获取日期范围的任务
  getTasksByDateRange: (startDate: string, endDate: string): TimerTask[] => {
    const allTasks = TimerStorage.getAllTasks();
    return allTasks.filter(task => {
      const taskDate = new Date(task.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return taskDate >= start && taskDate <= end;
    });
  },

  // 获取所有日期
  getAllDates: (): string[] => {
    const allTasks = TimerStorage.getAllTasks();
    const dates = new Set(allTasks.map(task => task.date));
    return Array.from(dates).sort().reverse(); // 最新的日期在前
  }
};

