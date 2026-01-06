// 里程碑系统类型定义

// AI 关键成就数据结构
export interface AchievementData {
  taskId: string;
  taskName: string;
  categoryPath: string;
  duration: number; // 秒
  reason?: string; // 为什么重要
}

// 确认的成就数据结构
export interface ConfirmedAchievement {
  description: string;
  impact: string;
  taskName?: string;
  duration?: number;
  categoryPath?: string;
}

// Prisma JSON 兼容的类型定义
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface WeeklyReviewData {
  aiTitle: string;
  aiFocus: string;
  aiInsights: string[];
  aiKeyAchievements: AchievementData[];
}

export interface MilestoneData {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  aiTitle: string;
  aiFocus: string;
  aiInsights: string[];
  aiKeyAchievements: JsonValue; // JSON
  confirmedAchievements: JsonValue; // JSON
  userNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMilestoneInput {
  startDate: string;
  endDate: string;
  aiTitle: string;
  aiFocus: string;
  aiInsights: string[];
  aiKeyAchievements: JsonValue;
  confirmedAchievements: JsonValue;
  userNotes?: string;
}







