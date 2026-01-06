import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserDuplicates() {
  try {
    console.log('🔍 检查同一用户是否有重复的标签名...\n');

    // 查找所有标签
    const allTags = await prisma.instanceTag.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true
      },
      orderBy: [
        { userId: 'asc' },
        { name: 'asc' }
      ]
    });

    // 按用户分组
    const userTags = {};
    allTags.forEach(tag => {
      if (!userTags[tag.userId]) {
        userTags[tag.userId] = {};
      }
      if (!userTags[tag.userId][tag.name]) {
        userTags[tag.userId][tag.name] = [];
      }
      userTags[tag.userId][tag.name].push(tag);
    });

    // 检查每个用户是否有重复标签
    let foundDuplicates = false;
    
    for (const [userId, tags] of Object.entries(userTags)) {
      const duplicates = Object.entries(tags).filter(([name, tagList]) => tagList.length > 1);
      
      if (duplicates.length > 0) {
        foundDuplicates = true;
        console.log(`⚠️  用户 ${userId} 有重复标签：\n`);
        
        duplicates.forEach(([name, tagList]) => {
          console.log(`  标签名: "${name}" (重复 ${tagList.length} 次)`);
          tagList.forEach((tag, index) => {
            console.log(`    ${index + 1}. ID: ${tag.id} | 创建时间: ${new Date(tag.createdAt).toLocaleString()}`);
          });
          console.log('');
        });
      }
    }

    if (!foundDuplicates) {
      console.log('✅ 没有发现同一用户的重复标签，可以安全继续！');
    } else {
      console.log('💡 需要清理同一用户的重复标签才能继续');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserDuplicates();



