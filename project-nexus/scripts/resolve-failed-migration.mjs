#!/usr/bin/env node

/**
 * 解决失败的 Prisma 迁移
 * 如果检测到失败的迁移，将其标记为已回滚，以便重新应用
 */

import { execSync } from 'child_process';

const MIGRATION_NAME = '20251123120000_add_taskdefinitionid_to_timertask';

console.log('🔍 检查是否有失败的迁移...');

try {
  // 尝试将失败的迁移标记为已回滚
  // 这样 Prisma 会重新尝试应用它
  execSync(`npx prisma migrate resolve --rolled-back ${MIGRATION_NAME}`, {
    stdio: 'inherit',
    env: process.env
  });
  console.log('✅ 失败的迁移已标记为已回滚，将重新应用');
} catch (error) {
  // 如果迁移不存在、已经解决或没有失败，继续
  const errorMsg = error.message || error.toString();
  if (
    errorMsg.includes('not found') || 
    errorMsg.includes('already') ||
    errorMsg.includes('No failed migration')
  ) {
    console.log('ℹ️  迁移状态正常，无需处理');
  } else {
    console.log('⚠️  处理失败迁移时出错，但将继续构建:', errorMsg);
    // 不抛出错误，让迁移部署继续尝试
    // 由于迁移文件使用了 IF NOT EXISTS，应该可以安全地重新运行
  }
}

