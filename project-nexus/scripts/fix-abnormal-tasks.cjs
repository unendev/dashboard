const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup of abnormal tasks...');

  // 1. 查找所有正在运行的任务
  const runningTasks = await prisma.timerTask.findMany({
    where: { isRunning: true }
  });

  const now = Math.floor(Date.now() / 1000);
  const ONE_DAY_SECONDS = 86400;

  for (const task of runningTasks) {
    if (!task.startTime) continue;

    const currentDuration = task.elapsedTime + (now - task.startTime);
    
    // 如果运行时间超过 24 小时，强制停止
    if (currentDuration > ONE_DAY_SECONDS) {
      console.log(`Stopping abnormal task: ${task.name} (ID: ${task.id})`);
      console.log(`  Duration: ${(currentDuration / 3600).toFixed(2)} hours`);
      
      await prisma.timerTask.update({
        where: { id: task.id },
        data: {
          isRunning: false,
          startTime: null,
          elapsedTime: task.elapsedTime + (now - task.startTime), // 保存时间，虽然很大
          isPaused: true,
          pausedTime: now
        }
      });
      console.log('  -> Stopped.');
    }
  }
  
  console.log('Cleanup complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
