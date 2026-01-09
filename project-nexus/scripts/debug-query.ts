import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugQuery() {
    console.log('\n🔍 调试查询:\n');

    // 1. 列出所有用户
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true
        }
    });

    console.log('📋 所有用户:');
    users.forEach((u, i) => {
        console.log(`   ${i + 1}. ID: ${u.id} | Email: ${u.email} | Name: ${u.name}`);
    });

    // 2. 查找所有包含"心理"的标签
    console.log('\n🔍 查找包含"心理"的标签:\n');
    const tags = await prisma.instanceTag.findMany({
        where: {
            name: {
                contains: '心理'
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true
                }
            },
            timerTasks: {
                select: {
                    timerTaskId: true
                }
            }
        }
    });

    if (tags.length === 0) {
        console.log('   未找到包含"心理"的标签');
    } else {
        tags.forEach(tag => {
            console.log(`   标签: ${tag.name}`);
            console.log(`   用户ID: ${tag.userId} (${tag.user.email})`);
            console.log(`   任务数: ${tag.timerTasks.length}`);
        });
    }

    // 3. 查找所有包含"小程序"的标签
    console.log('\n🔍 查找包含"小程序"的标签:\n');
    const tags2 = await prisma.instanceTag.findMany({
        where: {
            name: {
                contains: '小程序'
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true
                }
            },
            timerTasks: {
                select: {
                    timerTaskId: true
                }
            }
        }
    });

    if (tags2.length === 0) {
        console.log('   未找到包含"小程序"的标签');
    } else {
        tags2.forEach(tag => {
            console.log(`   标签: ${tag.name}`);
            console.log(`   用户ID: ${tag.userId} (${tag.user.email})`);
            console.log(`   任务数: ${tag.timerTasks.length}`);
        });
    }

    // 4. 查找最近的 TimerTask
    console.log('\n📋 最近10个 TimerTask:\n');
    const recentTasks = await prisma.timerTask.findMany({
        take: 10,
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true
                }
            },
            instanceTags: {
                include: {
                    instanceTag: true
                }
            }
        }
    });

    recentTasks.forEach((task, i) => {
        const tags = task.instanceTags.map(t => t.instanceTag.name).join(', ');
        console.log(`   ${i + 1}. ${task.date} | ${task.name || task.categoryPath}`);
        console.log(`      用户: ${task.user.email} (${task.userId})`);
        console.log(`      标签: ${tags || '无'}`);
    });

    await prisma.$disconnect();
}

debugQuery().catch(console.error);
