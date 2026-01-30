import { prisma } from '../lib/prisma';

async function main() {
    const count = await prisma.nexusItem.count();
    console.log(`📊 Current Database Item Count: ${count}`);

    // Calculate est size (rough)
    const estSizeMB = (count * 0.0005).toFixed(2); // 0.5KB per item
    console.log(`💾 Estimated Size: ~${estSizeMB} MB (Neon Free Tier is usually 500MB)`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
