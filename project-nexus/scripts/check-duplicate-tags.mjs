import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    console.log('🔍 检查 instance_tags 表中的重复数据...\n');

    // 查找所有标签
    const allTags = await prisma.instanceTag.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 总共有 ${allTags.length} 个标签\n`);

    // 统计每个名称的出现次数
    const nameCount = {};
    allTags.forEach(tag => {
      if (!nameCount[tag.name]) {
        nameCount[tag.name] = [];
      }
      nameCount[tag.name].push(tag);
    });

    // 找出重复的
    const duplicates = Object.entries(nameCount).filter(([name, tags]) => tags.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ 没有发现重复的标签名，可以安全地继续迁移！');
    } else {
      console.log(`⚠️  发现 ${duplicates.length} 个重复的标签名：\n`);
      
      duplicates.forEach(([name, tags]) => {
        console.log(`标签名: "${name}" (重复 ${tags.length} 次)`);
        tags.forEach((tag, index) => {
          console.log(`  ${index + 1}. ID: ${tag.id} | 用户: ${tag.userId} | 创建时间: ${new Date(tag.createdAt).toLocaleString()}`);
        });
        console.log('');
      });

      console.log('💡 建议：可以手动删除重复的标签，保留最早创建的那个');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();



