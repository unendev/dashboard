
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔍 Checking NexusItems for Heybox...');
        const count = await prisma.nexusItem.count({
            where: {
                source: 'Heybox'
            }
        });

        console.log(`✅ Total Heybox Items in DB: ${count}`);

        if (count > 0) {
            const items = await prisma.nexusItem.findMany({
                where: { source: 'Heybox' },
                take: 3,
                orderBy: { publishedAt: 'desc' }
            });
            console.log('--- Latest 3 Items ---');
            items.forEach(item => {
                console.log(`[${item.id}] ${item.title} (Tags: ${JSON.stringify(item.tags)})`);
            });
        } else {
            console.log('❌ No Heybox items found. Ingestion failed or DB is empty.');
        }

    } catch (e) {
        console.error('Error querying DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
