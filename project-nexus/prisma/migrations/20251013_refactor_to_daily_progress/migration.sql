-- 重构: 从周报模式迁移到每日进度模式
-- 1. 删除旧的 milestones 表
-- 2. 创建新的 daily_progress, skill_profiles, project_profiles 表

-- 删除旧表
DROP TABLE IF EXISTS "milestones" CASCADE;

-- 创建每日进度表
CREATE TABLE "daily_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "aiAnalysis" JSONB NOT NULL,
    "aiExtractedSkills" JSONB NOT NULL,
    "aiExtractedProjects" JSONB NOT NULL,
    "aiInsights" TEXT[],
    "conversationHistory" JSONB NOT NULL,
    "iterations" INTEGER NOT NULL DEFAULT 1,
    "finalAnalysis" JSONB,
    "userNotes" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "newSkillsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_progress_pkey" PRIMARY KEY ("id")
);

-- 创建技能档案表
CREATE TABLE "skill_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "category" TEXT,
    "proficiency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "occurrences" INTEGER NOT NULL DEFAULT 0,
    "firstUsed" TIMESTAMP(3) NOT NULL,
    "lastUsed" TIMESTAMP(3) NOT NULL,
    "weeklyTrend" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_profiles_pkey" PRIMARY KEY ("id")
);

-- 创建项目档案表
CREATE TABLE "project_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL,
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "skillsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_profiles_pkey" PRIMARY KEY ("id")
);

-- 创建唯一索引
CREATE UNIQUE INDEX "daily_progress_userId_date_key" ON "daily_progress"("userId", "date");
CREATE UNIQUE INDEX "skill_profiles_userId_skillName_key" ON "skill_profiles"("userId", "skillName");
CREATE UNIQUE INDEX "project_profiles_userId_projectName_key" ON "project_profiles"("userId", "projectName");

-- 添加外键约束
ALTER TABLE "daily_progress" ADD CONSTRAINT "daily_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_profiles" ADD CONSTRAINT "skill_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


