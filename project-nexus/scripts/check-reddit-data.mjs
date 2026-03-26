import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const latestReddit = await prisma.reddit_posts.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5
    })
    
    console.log('Latest Reddit Posts:')
    latestReddit.forEach(item => {
      console.log(`- ${item.title} (${item.timestamp ? item.timestamp.toISOString() : 'no timestamp'})`)
    })
    
    const count = await prisma.reddit_posts.count()
    console.log(`Total Reddit Posts: ${count}`)
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
