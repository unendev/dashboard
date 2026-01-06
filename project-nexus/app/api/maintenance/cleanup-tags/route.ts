import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting database tag cleanup maintenance...');
    
    // 1. 获取所有带有 instanceTag 的任务
    const tasksWithTags = await prisma.timerTask.findMany({
      where: {
        OR: [
            { instanceTag: { contains: ',' } },
            { instanceTag: { startsWith: '#' } }
        ]
      },
      select: {
        id: true,
        instanceTag: true,
        userId: true
      }
    });

    console.log(`🔍 Found ${tasksWithTags.length} tasks with legacy tag format.`);

    let processedCount = 0;
    let tagCreatedCount = 0;
    let linkCreatedCount = 0;

    for (const task of tasksWithTags) {
      if (!task.instanceTag) continue;

      // 2. 拆分标签
      const rawTags = task.instanceTag.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      if (rawTags.length === 0) continue;

      console.log(`  Processing task ${task.id}: [${task.instanceTag}] -> ${rawTags.length} tags`);

      for (const rawName of rawTags) {
        // 标准化名称：确保以 # 开头
        const standardizedName = rawName.startsWith('#') ? rawName : `#${rawName}`;

        // 3. 确保 InstanceTag 存在 (upsert)
        const instanceTag = await prisma.instanceTag.upsert({
          where: {
            userId_name: {
              userId: task.userId,
              name: standardizedName
            }
          },
          update: {},
          create: {
            name: standardizedName,
            userId: task.userId
          }
        });
        
        if (instanceTag.createdAt >= new Date(Date.now() - 5000)) {
            tagCreatedCount++;
        }

        // 4. 创建关联 (upsert link)
        try {
            await prisma.timerTaskInstanceTag.upsert({
                where: {
                  timerTaskId_instanceTagId: {
                    timerTaskId: task.id,
                    instanceTagId: instanceTag.id
                  }
                },
                update: {},
                create: {
                  timerTaskId: task.id,
                  instanceTagId: instanceTag.id
                }
            });
            linkCreatedCount++;
        } catch (e) {
            // Likely unique constraint or other error, safe to ignore for cleanup
        }
      }

      // 5. 清理旧字段（可选，这里我们将其置为 null 以表示已迁移）
      await prisma.timerTask.update({
          where: { id: task.id },
          data: { instanceTag: null }
      });

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        tasksProcessed: processedCount,
        tagsStandardized: tagCreatedCount,
        linksCreated: linkCreatedCount
      }
    });

  } catch (error) {
    console.error('❌ Tag cleanup failed:', error);
    return NextResponse.json({ 
        error: 'Cleanup failed', 
        details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
