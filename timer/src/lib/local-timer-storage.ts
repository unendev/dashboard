import type { TimerTask } from '@dashboard/shared';
import { getUnifiedItem, setUnifiedItem } from './unified-storage';

const TASKS_KEY = 'timer-tasks-v1';
const STOPWATCH_KEY = 'stopwatch-state-v1';
const COUNTDOWN_KEY = 'countdown-state-v1';

export function getAllTasks(): TimerTask[] {
  return getUnifiedItem<TimerTask[]>(TASKS_KEY, []);
}

export function saveAllTasks(tasks: TimerTask[]): void {
  setUnifiedItem(TASKS_KEY, tasks);
}

export function getTaskById(id: string): TimerTask | null {
  const tasks = getAllTasks();
  const find = (list: TimerTask[]): TimerTask | null => {
    for (const t of list) {
      if (t.id === id) return t;
      if (t.children) {
        const found = find(t.children);
        if (found) return found;
      }
    }
    return null;
  };
  return find(tasks);
}

export function createTask(data: Omit<TimerTask, 'id' | 'createdAt' | 'updatedAt'>): TimerTask {
  const tasks = getAllTasks();
  const now = new Date().toISOString();
  const task: TimerTask = {
    ...data,
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };
  tasks.unshift(task);
  saveAllTasks(tasks);
  return task;
}

export function updateTask(id: string, updates: Partial<TimerTask>): TimerTask | null {
  const tasks = getAllTasks();
  let updated: TimerTask | null = null;

  const updateRecursive = (list: TimerTask[]): TimerTask[] =>
    list.map((t) => {
      if (t.id === id) {
        updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
        return updated;
      }
      if (t.children) return { ...t, children: updateRecursive(t.children) };
      return t;
    });

  const result = updateRecursive(tasks);
  if (updated) saveAllTasks(result);
  return updated;
}

export function deleteTask(id: string): boolean {
  const tasks = getAllTasks();
  const filterRecursive = (list: TimerTask[]): TimerTask[] =>
    list
      .filter((t) => t.id !== id)
      .map((t) => (t.children ? { ...t, children: filterRecursive(t.children) } : t));

  const result = filterRecursive(tasks);
  if (result.length !== tasks.length) {
    saveAllTasks(result);
    return true;
  }
  return false;
}

export interface StopwatchState {
  isRunning: boolean;
  elapsedMs: number;
  startTime: number | null;
  laps: LapRecord[];
}

export interface LapRecord {
  lapNumber: number;
  lapTime: number;
  totalTime: number;
}

const defaultStopwatch: StopwatchState = {
  isRunning: false,
  elapsedMs: 0,
  startTime: null,
  laps: [],
};

export function getStopwatchState(): StopwatchState {
  return getUnifiedItem<StopwatchState>(STOPWATCH_KEY, defaultStopwatch);
}

export function saveStopwatchState(state: StopwatchState): void {
  setUnifiedItem(STOPWATCH_KEY, state);
}

export function resetStopwatchState(): void {
  setUnifiedItem(STOPWATCH_KEY, defaultStopwatch);
}

export interface CountdownState {
  isRunning: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  startTime: number | null;
  isPaused: boolean;
}

const defaultCountdown: CountdownState = {
  isRunning: false,
  totalSeconds: 0,
  remainingSeconds: 0,
  startTime: null,
  isPaused: false,
};

export function getCountdownState(): CountdownState {
  return getUnifiedItem<CountdownState>(COUNTDOWN_KEY, defaultCountdown);
}

export function saveCountdownState(state: CountdownState): void {
  setUnifiedItem(COUNTDOWN_KEY, state);
}

export function resetCountdownState(): void {
  setUnifiedItem(COUNTDOWN_KEY, defaultCountdown);
}
