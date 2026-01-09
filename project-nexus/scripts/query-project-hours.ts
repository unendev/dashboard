import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queryProjectHours(projectName: string, userId: string = 'user-1') {
    console.log(`\n📊 查询项目: "${projectName}"\n`);

    // 方案1: 查询 ProjectProfile（如果存在）
    const profile = await prisma.projectProfile.findUnique({
        where: {
            userId_projectName: { userId, projectName }
        }
    });

    if (profile) {
        const now = new Date();
        const weeksSinceStart = Math.max(
            1,
            Math.ceil((now.getTime() - profile.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        );
        const avgWeeklyHours = profile.totalHours / weeksSinceStart;

        console.log('✅ 从 ProjectProfile 获取数据:');
        console.log(`   总投入时长: ${profile.totalHours.toFixed(2)} 小时`);
        console.log(`   开始日期: ${profile.startDate.toISOString().split('T')[0]}`);
        console.log(`   最后活跃: ${profile.lastActive.toISOString().split('T')[0]}`);
        console.log(`   运行周数: ${weeksSinceStart} 周`);
        console.log(`   平均每周: ${avgWeeklyHours.toFixed(2)} 小时/周`);
        console.log(`   任务数量: ${profile.taskCount}`);

        if (profile.skillsUsed.length > 0) {
            console.log(`   使用技能: ${profile.skillsUsed.join(', ')}`);
        }
    } else {
        console.log('⚠️  ProjectProfile 中未找到该项目');
    }

    // 方案2: 实时计算 TimerTask（更准确）
    console.log('\n🔍 从 TimerTask 实时计算:\n');

    const tasks = await prisma.timerTask.findMany({
        where: {
            userId,
            OR: [
                { categoryPath: { contains: projectName } },
                { name: { contains: projectName } }
            ]
        },
        select: {
            id: true,
            name: true,
            categoryPath: true,
            elapsedTime: true,
            date: true,
            createdAt: true
        },
        orderBy: {
            date: 'asc'
        }
    });

    if (tasks.length === 0) {
        console.log('   未找到相关任务');
        await prisma.$disconnect();
        return;
    }

    const totalSeconds = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const totalHours = totalSeconds / 3600;

    const dates = tasks.map(t => new Date(t.date));
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const daysSinceStart = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const weeksSinceStart = Math.max(1, daysSinceStart / 7);
    const avgWeeklyHours = totalHours / weeksSinceStart;

    console.log(`   找到任务: ${tasks.length} 个`);
    console.log(`   总投入时长: ${totalHours.toFixed(2)} 小时`);
    console.log(`   开始日期: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   最后日期: ${endDate.toISOString().split('T')[0]}`);
    console.log(`   运行天数: ${daysSinceStart} 天 (${weeksSinceStart.toFixed(1)} 周)`);
    console.log(`   平均每周: ${avgWeeklyHours.toFixed(2)} 小时/周`);
    console.log(`   平均每天: ${(totalHours / daysSinceStart).toFixed(2)} 小时/天`);

    // 显示最近5个任务
    console.log('\n📋 最近的任务:');
    tasks.slice(-5).forEach(task => {
        const hours = (task.elapsedTime / 3600).toFixed(2);
        console.log(`   ${task.date} | ${hours}h | ${task.name || task.categoryPath}`);
    });

    await prisma.$disconnect();
}

// 从命令行参数获取项目名称
const projectName = process.argv[2] || '心理小程序';
const userId = process.argv[3] || 'user-1';

queryProjectHours(projectName, userId).catch(console.error);
