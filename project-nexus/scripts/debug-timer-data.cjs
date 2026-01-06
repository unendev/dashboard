const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying TimerTasks...');

  // 1. 查找正在运行的任务
  const runningTasks = await prisma.timerTask.findMany({
    where: { isRunning: true },
    select: { id: true, name: true, startTime: true, elapsedTime: true, categoryPath: true, userId: true }
  });

  console.log('\n--- Running Tasks ---');
  runningTasks.forEach(task => {
    console.log(`Task: ${task.name} (ID: ${task.id})`);
    console.log(`  Category: ${task.categoryPath}`);
    console.log(`  StartTime: ${task.startTime} (Now: ${Math.floor(Date.now() / 1000)})`);
    console.log(`  ElapsedTime: ${task.elapsedTime}`);
    const currentDuration = task.elapsedTime + (Math.floor(Date.now() / 1000) - task.startTime);
    console.log(`  Calculated Duration (sec): ${currentDuration}`);
    console.log(`  Calculated Duration (hours): ${currentDuration / 3600}`);
  });

  // 2. 查找所有任务中 elapsedTime 特别大的 (> 100小时 = 360000秒)
  const hugeTimeTasks = await prisma.timerTask.findMany({
    where: { elapsedTime: { gt: 360000 } },
    select: { id: true, name: true, elapsedTime: true, categoryPath: true }
  });

  console.log('\n--- Tasks with Huge ElapsedTime (> 100h) ---');
  hugeTimeTasks.forEach(task => {
    console.log(`Task: ${task.name} (ID: ${task.id})`);
    console.log(`  ElapsedTime: ${task.elapsedTime} (${task.elapsedTime / 3600} hours)`);
  });

  // 3. 搜索 "日常琐事"
  const miscTasks = await prisma.timerTask.findMany({
    where: {
      OR: [
        { name: { contains: '日常琐事' } },
        { categoryPath: { contains: '日常琐事' } }
      ]
    },
    select: { id: true, name: true, categoryPath: true }
  });

  console.log('\n--- Tasks matching "日常琐事" ---');
  miscTasks.forEach(task => {
    console.log(`Task: ${task.name} (ID: ${task.id}, Category: ${task.categoryPath})`);
  });

  // 4. 搜索 "网文"
  const webNovelTasks = await prisma.timerTask.findMany({
    where: {
      OR: [
        { name: { contains: '网文' } },
        { categoryPath: { contains: '网文' } }
      ]
    },
    select: { id: true, name: true, categoryPath: true, elapsedTime: true, startTime: true, isRunning: true }
  });
  
  console.log('\n--- Tasks matching "网文" ---');
  webNovelTasks.forEach(task => {
    console.log(`Task: ${task.name} (ID: ${task.id})`);
    console.log(`  Category: ${task.categoryPath}`);
    console.log(`  Running: ${task.isRunning}`);
    console.log(`  StartTime: ${task.startTime}`);
    console.log(`  ElapsedTime: ${task.elapsedTime}`);
    if (task.startTime) {
        const currentDuration = task.elapsedTime + (Math.floor(Date.now() / 1000) - task.startTime);
        console.log(`  Current Duration (hours): ${currentDuration / 3600}`);
    }
  });

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
