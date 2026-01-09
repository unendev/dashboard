import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findCorrectUserId() {
    // 查找所有用户及其标签数
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            _count: {
                select: {
                    instanceTags: true,
                    timerTasks: true
                }
            }
        }
    });

    console.log('\n所有用户及其数据量:\n');
    for (const user of users) {
        console.log(`用户ID: ${user.id}`);
        console.log(`邮箱: ${user.email}`);
        console.log(`标签数: ${user._count.instanceTags}`);
        console.log(`任务数: ${user._count.timerTasks}`);
        console.log('---');
    }

    await prisma.$disconnect();
}

findCorrectUserId().catch(console.error);
