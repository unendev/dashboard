export interface DailyHealthData {
  /** 日期 (格式: YYYY-MM-DD) */
  date: string;
  
  /** 当日总步数 */
  steps: number;
  
  /** 睡眠时长 (单位: 小时) */
  sleepHours: number;
  
  /** 平均心率 (次/分钟) */
  heartRate: number;
  
  /** 燃烧卡路里 (千卡) */
  calories: number;
}