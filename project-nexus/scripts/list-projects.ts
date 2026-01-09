import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllProjects(userId: string = 'user-1') {
    console.log('\n📊 所有项目列表:\n');

    // 1. 从 ProjectProfile 获取
    const profiles = await prisma.projectProfile.findMany({
        where: { userId },
        orderBy: { lastActive: 'desc' }
    });

    if (profiles.length > 0) {
        console.log('✅ ProjectProfile 中的项目:');
        profiles.forEach((p, i) => {
            const weeks = Math.max(1, Math.ceil((new Date().getTime() - p.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
            const avgWeekly = (p.totalHours / weeks).toFixed(2);
            console.log(`   ${i + 1}. ${p.projectName}`);
            console.log(`      总时长: ${p.totalHours.toFixed(2)}h | 平均: ${avgWeekly}h/周 | 任务数: ${p.taskCount}`);
        });
    } else {
        console.log('⚠️  ProjectProfile 中无数据');
    }

    // 2. 从 TimerTask 中提取所有 categoryPath
    console.log('\n🔍 TimerTask 中的分类路径 (Top 20):\n');

    const tasks = await prisma.timerTask.findMany({
        where: { userId },
        select: {
            categoryPath: true,
            name: true,
            elapsedTime: true
        }
    });

    // 按 categoryPath 分组统计
    const categoryStats = new Map<string, { count: number; totalSeconds: number }>();

    tasks.forEach(task => {
        const path = task.categoryPath || task.name || '未分类';
        const existing = categoryStats.get(path) || { count: 0, totalSeconds: 0 };
        categoryStats.set(path, {
            count: existing.count + 1,
            totalSeconds: existing.totalSeconds + task.elapsedTime
        });
    });

    // 排序并显示
    const sorted = Array.from(categoryStats.entries())
        .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds)
        .slice(0, 20);

    sorted.forEach(([path, stats], i) => {
        const hours = (stats.totalSeconds / 3600).toFixed(2);
        console.log(`   ${i + 1}. ${path}`);
        console.log(`      ${stats.count} 个任务 | ${hours} 小时`);
    });

    await prisma.$disconnect();
}

const userId = process.argv[2] || 'user-1';
listAllProjects(userId).catch(console.error);
