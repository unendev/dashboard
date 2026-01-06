-- CreateTable: Milestone 模型
-- 用于存储用户的每周回顾和成长里程碑

CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "aiTitle" TEXT NOT NULL,
    "aiFocus" TEXT NOT NULL,
    "aiInsights" TEXT[],
    "aiKeyAchievements" JSONB NOT NULL,
    "confirmedAchievements" JSONB NOT NULL,
    "userNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "milestones_userId_startDate_endDate_key" ON "milestones"("userId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;







