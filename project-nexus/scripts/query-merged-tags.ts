import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queryMultipleTags(tagNames: string[], userId: string) {
    console.log(`\n📊 查询多个标签: ${tagNames.map(t => `"${t}"`).join(', ')}\n`);

    // 查找所有匹配的标签
    const allTasks: any[] = [];

    for (const tagName of tagNames) {
        const tasks = await prisma.timerTask.findMany({
            where: {
                userId,
                instanceTags: {
                    some: {
                        instanceTag: {
                            name: tagName
                        }
                    }
                }
            },
            include: {
                instanceTags: {
                    include: {
                        instanceTag: true
                    }
                }
            }
        });

        console.log(`   "${tagName}": ${tasks.length} 个任务`);
        allTasks.push(...tasks);
    }

    // 去重（同一个任务可能有多个标签）
    const uniqueTasks = Array.from(
        new Map(allTasks.map(task => [task.id, task])).values()
    );

    if (uniqueTasks.length === 0) {
        console.log('\n❌ 未找到任何任务');
        await prisma.$disconnect();
        return;
    }

    // 计算统计数据
    const totalSeconds = uniqueTasks.reduce((sum, task) => sum + task.elapsedTime, 0);
    const totalHours = totalSeconds / 3600;

    const dates = uniqueTasks.map(t => new Date(t.date));
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const daysSinceStart = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const weeksSinceStart = Math.max(1, daysSinceStart / 7);
    const avgWeeklyHours = totalHours / weeksSinceStart;

    console.log('\n✅ 合并统计结果:\n');
    console.log(`   找到任务: ${uniqueTasks.length} 个（去重后）`);
    console.log(`   总投入时长: ${totalHours.toFixed(2)} 小时`);
    console.log(`   开始日期: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   最后日期: ${endDate.toISOString().split('T')[0]}`);
    console.log(`   运行天数: ${daysSinceStart} 天 (${weeksSinceStart.toFixed(1)} 周)`);
    console.log(`   ⭐ 平均每周: ${avgWeeklyHours.toFixed(2)} 小时/周`);
    console.log(`   平均每天: ${(totalHours / daysSinceStart).toFixed(2)} 小时/天`);

    // 按周统计
    const weeklyStats = new Map<string, number>();
    uniqueTasks.forEach(task => {
        const date = new Date(task.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        weeklyStats.set(weekKey, (weeklyStats.get(weekKey) || 0) + task.elapsedTime);
    });

    console.log('\n📈 每周投入时长:\n');
    const sortedWeeks = Array.from(weeklyStats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    sortedWeeks.forEach(([week, seconds]) => {
        const hours = (seconds / 3600).toFixed(2);
        console.log(`   ${week} 周: ${hours} 小时`);
    });

    // 显示所有任务
    console.log('\n📋 所有任务:\n');
    const sortedTasks = [...uniqueTasks].sort((a, b) => a.date.localeCompare(b.date));
    sortedTasks.forEach(task => {
        const hours = (task.elapsedTime / 3600).toFixed(2);
        const tags = task.instanceTags.map(t => t.instanceTag.name).join(', ');
        console.log(`   ${task.date} | ${hours}h | ${task.name || task.categoryPath} [${tags}]`);
    });

    await prisma.$disconnect();
}

// 查询两个标签
const userId = 'cmfw7pwcc0000l804mxl0ja45';
const tagNames = ['心理小程序', '#心理小程序'];

queryMultipleTags(tagNames, userId).catch(console.error);
