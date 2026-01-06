-- AlterTable: 为 posts 表添加回复数和参与者数字段
-- 这是安全操作，只添加字段，不删除数据

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "replies_count" INTEGER DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "participants_count" INTEGER DEFAULT 0;



















