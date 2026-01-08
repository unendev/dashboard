/**
 * 数据迁移脚本：将旧宝藏的主题从 tags 迁移到 theme 字段
 * 
 * 运行方式：
 * pnpm tsx scripts/migrate-treasure-themes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRIMARY_THEMES = ['life', 'knowledge', 'thought', 'root'];

async function migrateTreasureThemes() {
    console.log('🚀 开始迁移宝藏主题数据...\n');

    try {
        // 1. 查找需要迁移的宝藏
        const treasures = await prisma.treasure.findMany({
            where: {
                OR: [
                    { theme: { isEmpty: true } },  // theme 为空
                    { theme: null }                // theme 为 null
                ]
            },
            select: {
                id: true,
                title: true,
                tags: true,
                theme: true
            }
        });

        console.log(`📊 找到 ${treasures.length} 个需要迁移的宝藏\n`);

        if (treasures.length === 0) {
            console.log('✅ 没有需要迁移的数据！');
            return;
        }

        let migratedCount = 0;
        let skippedCount = 0;

        // 2. 逐个迁移
        for (const treasure of treasures) {
            // 从 tags 中提取主题
            const themesInTags: string[] = [];
            const remainingTags: string[] = [];

            treasure.tags.forEach(tag => {
                const tagLower = tag.toLowerCase().replace(/^#/, '');
                if (PRIMARY_THEMES.includes(tagLower)) {
                    themesInTags.push(tagLower);
                } else {
                    remainingTags.push(tag);
                }
            });

            // 如果找到主题，执行迁移
            if (themesInTags.length > 0) {
                await prisma.treasure.update({
                    where: { id: treasure.id },
                    data: {
                        theme: themesInTags,
                        tags: remainingTags
                    }
                });

                console.log(`✅ [${treasure.id}] "${treasure.title}"`);
                console.log(`   主题: ${themesInTags.join(', ')}`);
                console.log(`   标签: ${remainingTags.slice(0, 3).join(', ')}${remainingTags.length > 3 ? '...' : ''}\n`);

                migratedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log('\n📈 迁移统计：');
        console.log(`   ✅ 成功迁移: ${migratedCount} 个`);
        console.log(`   ⏭️  跳过: ${skippedCount} 个（无主题标签）`);
        console.log('\n🎉 迁移完成！');

    } catch (error) {
        console.error('❌ 迁移失败:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// 执行迁移
migrateTreasureThemes()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
