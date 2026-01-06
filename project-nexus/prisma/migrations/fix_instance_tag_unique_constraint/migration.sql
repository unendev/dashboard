-- 修复 InstanceTag 表的唯一性约束
-- 将全局唯一的 name 字段改为 name + userId 的复合唯一约束

-- 1. 删除原有的唯一约束（如果存在）
ALTER TABLE "instance_tags" DROP CONSTRAINT IF EXISTS "instance_tags_name_key";

-- 2. 添加新的复合唯一约束
ALTER TABLE "instance_tags" ADD CONSTRAINT "instance_tags_name_userId_key" UNIQUE ("name", "userId");

