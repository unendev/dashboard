#!/usr/bin/env node

/**
 * 简化的 Neon 数据库唤醒脚本
 */

import { PrismaClient } from '@prisma/client'

const originalUrl = process.env.POSTGRES_PRISMA_URL;

if (!originalUrl) {
  console.error('❌ POSTGRES_PRISMA_URL environment variable not found!');
  process.exit(1);
}

// Robustly add connect_timeout to the database URL
const separator = originalUrl.includes('?') ? '&' : '?';
const urlWithTimeout = `${originalUrl}${separator}connect_timeout=60`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: urlWithTimeout,
    },
  },
});

async function wakeDatabase() {
  console.log('🔄 唤醒数据库...')
  
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ 数据库就绪！')
  } catch (error) {
    console.error('❌ 连接失败：', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

wakeDatabase()

