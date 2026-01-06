import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  try {
    console.log('====================================')
    console.log('📊 数据库数据分析')
    console.log('====================================\n')

    // 1. 获取所有TimerTask数据做本地聚合
    console.log('【加载TimerTask数据...】')
    const allTasks = await prisma.timerTask.findMany({
      orderBy: { date: 'desc' }
    })
    
    console.log(`✅ 总任务数: ${allTasks.length}\n`)

    // 2. 按日期聚合（本地计算）
    console.log('【按日期统计 - 最近15天】')
    const dateMap = new Map()
    allTasks.forEach(task => {
      if (!dateMap.has(task.date)) {
        dateMap.set(task.date, { count: 0, totalTime: 0, tasks: [] })
      }
      const stat = dateMap.get(task.date)
      stat.count++
      stat.totalTime += task.elapsedTime
      stat.tasks.push(task.name)
    })
    
    const sortedDates = Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 15)
    
    sortedDates.forEach(([date, stat]) => {
      const hours = Math.floor(stat.totalTime / 3600)
      const minutes = Math.floor((stat.totalTime % 3600) / 60)
      console.log(`${date}: ${stat.count}个任务, 总时长 ${hours}h ${minutes}m`)
    })

    // 3. 按分类聚合
    console.log('\n【按分类统计 - 全部时间】')
    const categoryMap = new Map()
    allTasks.forEach(task => {
      if (!categoryMap.has(task.categoryPath)) {
        categoryMap.set(task.categoryPath, { count: 0, totalTime: 0 })
      }
      const stat = categoryMap.get(task.categoryPath)
      stat.count++
      stat.totalTime += task.elapsedTime
    })
    
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, 15)
    
    sortedCategories.forEach(([category, stat]) => {
      const hours = Math.floor(stat.totalTime / 3600)
      const minutes = Math.floor((stat.totalTime % 3600) / 60)
      console.log(`${category}: ${stat.count}次, 累计 ${hours}h ${minutes}m`)
    })

    // 4. 最近30天的详细分析
    console.log('\n【最近30天深度分析】')
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]
    
    const recentTasks = allTasks.filter(t => t.date >= cutoffDate)
    const recentDates = new Set(recentTasks.map(t => t.date))
    const recentTotalTime = recentTasks.reduce((sum, t) => sum + t.elapsedTime, 0)
    
    console.log(`📅 活跃天数: ${recentDates.size}天`)
    console.log(`📝 任务总数: ${recentTasks.length}`)
    console.log(`⏱️  总时长: ${Math.floor(recentTotalTime / 3600)}h ${Math.floor((recentTotalTime % 3600) / 60)}m`)
    console.log(`📊 日均时长: ${Math.floor(recentTotalTime / recentDates.size / 3600)}h ${Math.floor((recentTotalTime / recentDates.size % 3600) / 60)}m`)
    console.log(`📈 日均任务数: ${(recentTasks.length / recentDates.size).toFixed(1)}个`)

    // 5. 检查今天的数据
    const today = new Date().toISOString().split('T')[0]
    const todayTasks = allTasks.filter(t => t.date === today)
    
    console.log(`\n【今天 ${today}】`)
    console.log(`任务数: ${todayTasks.length}`)
    const todayTime = todayTasks.reduce((sum, t) => sum + t.elapsedTime, 0)
    console.log(`总时长: ${Math.floor(todayTime / 3600)}h ${Math.floor((todayTime % 3600) / 60)}m`)
    console.log('\n任务列表:')
    todayTasks.forEach((task, i) => {
      const mins = Math.floor(task.elapsedTime / 60)
      console.log(`  ${i + 1}. ${task.name} (${mins}m) - ${task.categoryPath}`)
    })

    // 6. 检查数据质量
    console.log('\n【数据质量分析】')
    const uncategorized = allTasks.filter(t => t.categoryPath === '未分类')
    const withCategory = allTasks.filter(t => t.categoryPath !== '未分类')
    const withInstanceTag = allTasks.filter(t => t.instanceTag)
    
    console.log(`✅ 有分类: ${withCategory.length} (${(withCategory.length / allTasks.length * 100).toFixed(1)}%)`)
    console.log(`⚠️  未分类: ${uncategorized.length} (${(uncategorized.length / allTasks.length * 100).toFixed(1)}%)`)
    console.log(`🏷️  有标签: ${withInstanceTag.length} (${(withInstanceTag.length / allTasks.length * 100).toFixed(1)}%)`)
    
    // 7. 时间分布分析
    console.log('\n【时长分布】')
    const shortTasks = allTasks.filter(t => t.elapsedTime < 300) // <5分钟
    const mediumTasks = allTasks.filter(t => t.elapsedTime >= 300 && t.elapsedTime < 1800) // 5-30分钟
    const longTasks = allTasks.filter(t => t.elapsedTime >= 1800 && t.elapsedTime < 3600) // 30-60分钟
    const veryLongTasks = allTasks.filter(t => t.elapsedTime >= 3600) // >1小时
    
    console.log(`⚡ <5分钟: ${shortTasks.length}个`)
    console.log(`📝 5-30分钟: ${mediumTasks.length}个`)
    console.log(`📚 30-60分钟: ${longTasks.length}个`)
    console.log(`🔥 >1小时: ${veryLongTasks.length}个`)

    // 8. 检查AI总结
    console.log('\n【AI总结数据】')
    const summaries = await prisma.aISummary.findMany({
      orderBy: { date: 'desc' },
      take: 5
    })
    console.log(`总数: ${await prisma.aISummary.count()}`)
    if (summaries.length > 0) {
      console.log('\n最近5天:')
      summaries.forEach(s => {
        console.log(`  ${s.date}: ${s.taskCount}个任务, ${Math.floor(s.totalTime/3600)}h ${Math.floor((s.totalTime%3600)/60)}m`)
      })
    }

    console.log('\n====================================')
    console.log('✅ 分析完成')
    console.log('====================================\n')

  } catch (error) {
    console.error('❌ 分析失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()

