import { prisma } from './prisma';

interface MergeResult {
  mergedCount: number;
  deletedCount: number;
  details: Array<{
    primaryTaskId: string;
    primaryTaskName: string;
    mergedTaskIds: string[];
    totalElapsedTime: number;
    totalInitialTime: number;
  }>;
}

/**
 * 合并指定用户名称和分类路径相同的 TimerTask。
 * 合并规则：
 * 1. 识别名称和 categoryPath 完全相同的任务。
 * 2. 在每个重复组中，createdAt 最早的任务将成为主任务。
 * 3. 所有次要任务的 elapsedTime 和 initialTime 将累加到主任务。
 * 4. 所有次要任务关联的唯一 instanceTags 将关联到主任务。
 * 5. 所有的次要任务将被删除。
 *
 * @param userId 执行合并操作的用户ID。
 * @returns 合并结果的摘要。
 */
export async function mergeDuplicateTimerTasks(userId: string): Promise<MergeResult> {
  const result: MergeResult = {
    mergedCount: 0,
    deletedCount: 0,
    details: [],
  };

  const timerTasks = await prisma.timerTask.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }, // 确保主任务是 createdAt 最早的
    include: {
      instanceTags: true, // 包含关联的标签以便合并
    },
  });

  // 使用 Map 对任务进行分组
  // Key: `${name}::${categoryPath}`
  const groupedTasks = new Map<string, typeof timerTasks>();

  for (const task of timerTasks) {
    const key = `${task.name}::${task.categoryPath}`;
    if (!groupedTasks.has(key)) {
      groupedTasks.set(key, []);
    }
    groupedTasks.get(key)!.push(task);
  }

  for (const [key, tasksInGroup] of groupedTasks.entries()) {
    if (tasksInGroup.length > 1) {
      // 存在重复任务
      const primaryTask = tasksInGroup[0]; // createdAt 最早的
      const secondaryTasks = tasksInGroup.slice(1);

      let accumulatedElapsedTime = primaryTask.elapsedTime;
      let accumulatedInitialTime = primaryTask.initialTime;
      const mergedTaskIds: string[] = [];
      const uniqueInstanceTagIds = new Set(primaryTask.instanceTags.map(tag => tag.instanceTagId));

      for (const secondaryTask of secondaryTasks) {
        mergedTaskIds.push(secondaryTask.id);
        accumulatedElapsedTime += secondaryTask.elapsedTime;
        accumulatedInitialTime += secondaryTask.initialTime;

        // 收集次要任务的唯一 instanceTagIds
        for (const tag of secondaryTask.instanceTags) {
          uniqueInstanceTagIds.add(tag.instanceTagId);
        }
      }

      result.details.push({
        primaryTaskId: primaryTask.id,
        primaryTaskName: primaryTask.name || '未命名任务',
        mergedTaskIds: mergedTaskIds,
        totalElapsedTime: accumulatedElapsedTime,
        totalInitialTime: accumulatedInitialTime,
      });

      // 执行数据库操作：更新主任务，处理标签，删除次要任务
      await prisma.$transaction(async (tx) => {
        // 1. 更新主任务的计时数据
        await tx.timerTask.update({
          where: { id: primaryTask.id },
          data: {
            elapsedTime: accumulatedElapsedTime,
            initialTime: accumulatedInitialTime,
            updatedAt: new Date(),
            // 其他字段保持不变
          },
        });

        // 2. 处理 InstanceTags 关系
        // 先删除主任务上所有旧的标签关系，然后统一创建
        await tx.timerTaskInstanceTag.deleteMany({
          where: { timerTaskId: primaryTask.id },
        });

        // 创建新的标签关系（确保唯一性，尽管 Set 已经保证了）
        const newInstanceTagRelations = Array.from(uniqueInstanceTagIds).map(tagId => ({
          timerTaskId: primaryTask.id,
          instanceTagId: tagId,
        }));

        if (newInstanceTagRelations.length > 0) {
          await tx.timerTaskInstanceTag.createMany({
            data: newInstanceTagRelations,
            skipDuplicates: true, // 防止意外重复
          });
        }
        
        // 3. 删除次要任务及其关联的标签
        for (const secondaryTask of secondaryTasks) {
          // 删除次要任务关联的 instanceTags
          await tx.timerTaskInstanceTag.deleteMany({
            where: { timerTaskId: secondaryTask.id },
          });
          // 删除次要任务本身
          await tx.timerTask.delete({
            where: { id: secondaryTask.id },
          });
        }
      });
      
      result.mergedCount++;
      result.deletedCount += secondaryTasks.length;
    }
  }

  return result;
}
