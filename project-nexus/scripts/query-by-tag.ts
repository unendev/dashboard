import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queryByInstanceTag(tagName: string, userId: string = 'user-1') {
    console.log(`\n📊 查询实例标签: "${tagName}"\n`);

    // 1. 查找该标签
    const tag = await prisma.instanceTag.findUnique({
        where: {
            userId_name: { userId, name: tagName }
        },
        include: {
            timerTasks: {
                include: {
                    timerTask: {
                        select: {
                            id: true,
                            name: true,
                            categoryPath: true,
                            elapsedTime: true,
                            date: true,
                            createdAt: true
                        }
                    }
                }
            }
        }
    });

    if (!tag) {
        console.log('❌ 未找到该标签\n');

        // 列出所有可用标签
        console.log('📋 所有可用的实例标签:\n');
        const allTags = await prisma.instanceTag.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { timerTasks: true }
                }
            },
            orderBy: {
                timerTasks: {
                    _count: 'desc'
                }
            }
        });

        allTags.forEach((t, i) => {
            console.log(`   ${i + 1}. ${t.name} (${t._count.timerTasks} 个任务)`);
        });

        await prisma.$disconnect();
        return;
    }

    const tasks = tag.timerTasks.map(tt => tt.timerTask);

    if (tasks.length === 0) {
        console.log('⚠️  该标签下没有任务');
        await prisma.$disconnect();
        return;
    }

    // 计算统计数据
    const totalSeconds = tasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const totalHours = totalSeconds / 3600;

    const dates = tasks.map(t => new Date(t.date));
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const daysSinceStart = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const weeksSinceStart = Math.max(1, daysSinceStart / 7);
    const avgWeeklyHours = totalHours / weeksSinceStart;

    console.log('✅ 统计结果:\n');
    console.log(`   找到任务: ${tasks.length} 个`);
    console.log(`   总投入时长: ${totalHours.toFixed(2)} 小时`);
    console.log(`   开始日期: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   最后日期: ${endDate.toISOString().split('T')[0]}`);
    console.log(`   运行天数: ${daysSinceStart} 天 (${weeksSinceStart.toFixed(1)} 周)`);
    console.log(`   平均每周: ${avgWeeklyHours.toFixed(2)} 小时/周`);
    console.log(`   平均每天: ${(totalHours / daysSinceStart).toFixed(2)} 小时/天`);

    // 按周统计
    const weeklyStats = new Map<string, number>();
    tasks.forEach(task => {
        const date = new Date(task.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // 周日为一周开始
        const weekKey = weekStart.toISOString().split('T')[0];

        weeklyStats.set(weekKey, (weeklyStats.get(weekKey) || 0) + task.elapsedTime);
    });

    console.log('\n📈 每周投入时长:\n');
    const sortedWeeks = Array.from(weeklyStats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    sortedWeeks.forEach(([week, seconds]) => {
        const hours = (seconds / 3600).toFixed(2);
        console.log(`   ${week} 周: ${hours} 小时`);
    });

    // 显示最近10个任务
    console.log('\n📋 最近的任务:\n');
    const sortedTasks = [...tasks].sort((a, b) => a.date.localeCompare(b.date));
    sortedTasks.slice(-10).forEach(task => {
        const hours = (task.elapsedTime / 3600).toFixed(2);
        console.log(`   ${task.date} | ${hours}h | ${task.name || task.categoryPath}`);
    });

    await prisma.$disconnect();
}

// 从命令行参数获取标签名称
const tagName = process.argv[2] || '心理小程序';
const userId = process.argv[3] || 'user-1';

queryByInstanceTag(tagName, userId).catch(console.error);
