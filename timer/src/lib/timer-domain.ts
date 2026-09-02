import type { TimerTask } from '@dashboard/shared';

/**
 * 获取当前逻辑日期字符串 (格式: YYYY-MM-DD)
 * - 规则：每日以【凌晨 4:00 (04:00)】作为分界线换天。
 * - 00:00 ~ 03:59:59 依然算作昨天的作息周期。
 */
export function getLogicalDateString(now: Date = new Date()): string {
  // 减去 4 小时偏移量，实现凌晨 4 点自然换天
  const d = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 纯函数：计算某个任务【今日（当天）】的实际已用总秒数
 * - 如果当天未学过或未创建过当天 Session，必定返回 0
 * - 如果当天正在运行中，实时叠加上当前 session 的秒数
 */
export function getTodayElapsedSeconds(
  sessions: TimerTask[],
  taskName: string,
  nowSec: number = Math.floor(Date.now() / 1000)
): number {
  if (!taskName) return 0;
  const targetName = taskName.trim();
  const todayStr = getLogicalDateString();

  let todayTotal = 0;
  for (const session of sessions) {
    if (session.name.trim() === targetName && session.date === todayStr) {
      todayTotal += (session.elapsedTime || 0);
      if (session.isRunning && !session.isPaused && session.startTime) {
        todayTotal += Math.max(0, nowSec - session.startTime);
      }
    }
  }
  return todayTotal;
}

/**
 * 纯函数：计算某个任务【全生命周期终身总累计】的实际已用总秒数
 * - 扫描所有日期（昨天、前天、上周、今天）的所有 Session 汇总
 * - 如果当前正在运行中，实时叠加上正在跑的秒数
 */
export function getTotalAccumulatedSeconds(
  sessions: TimerTask[],
  taskName: string,
  nowSec: number = Math.floor(Date.now() / 1000)
): number {
  if (!taskName) return 0;
  const targetName = taskName.trim();

  let grandTotal = 0;
  for (const session of sessions) {
    if (session.name.trim() === targetName) {
      grandTotal += (session.elapsedTime || 0);
      if (session.isRunning && !session.isPaused && session.startTime) {
        grandTotal += Math.max(0, nowSec - session.startTime);
      }
    }
  }
  return grandTotal;
}

/**
 * 格式化总累计时长为人类直观友好的字串 (如: 0m, 45m, 1h 21m, 12h)
 */
export function formatTotalAccumulatedTime(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}
