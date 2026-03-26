import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const latestItems = await prisma.nexusItem.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 5
    })
    
    console.log('Latest Nexus Items:')
    latestItems.forEach(item => {
      console.log(`- [${item.source}] ${item.title} (${item.publishedAt.toISOString()})`)
    })
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
