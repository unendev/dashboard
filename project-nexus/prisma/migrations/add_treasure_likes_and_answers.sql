-- 添加点赞和回答功能的迁移脚本
-- 手动运行此 SQL 文件到数据库

-- 为 Treasure 表添加 likesCount 字段
ALTER TABLE "treasures" ADD COLUMN "likesCount" INTEGER NOT NULL DEFAULT 0;

-- 创建 TreasureLike 表
CREATE TABLE "treasure_likes" (
    "id" TEXT NOT NULL,
    "treasureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasure_likes_pkey" PRIMARY KEY ("id")
);

-- 创建 TreasureAnswer 表
CREATE TABLE "treasure_answers" (
    "id" TEXT NOT NULL,
    "treasureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasure_answers_pkey" PRIMARY KEY ("id")
);

-- 创建唯一索引（防止重复点赞）
CREATE UNIQUE INDEX "treasure_likes_treasureId_userId_key" ON "treasure_likes"("treasureId", "userId");

-- 添加外键约束
ALTER TABLE "treasure_likes" ADD CONSTRAINT "treasure_likes_treasureId_fkey" 
    FOREIGN KEY ("treasureId") REFERENCES "treasures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treasure_answers" ADD CONSTRAINT "treasure_answers_treasureId_fkey" 
    FOREIGN KEY ("treasureId") REFERENCES "treasures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 注意：没有为 userId 添加外键约束，因为可能还未在数据库中关联用户表
-- 如果需要，可以手动添加：
-- ALTER TABLE "treasure_likes" ADD CONSTRAINT "treasure_likes_userId_fkey" 
--     FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE "treasure_answers" ADD CONSTRAINT "treasure_answers_userId_fkey" 
--     FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

