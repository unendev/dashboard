const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    });
}

const prisma = new PrismaClient();

async function main() {
    console.log('Checking "tasks" table (fallback)...');

    try {
        // We use queryRaw because Prisma client is typed to use 'timer_tasks' (TimerTask model)
        // If we want to check 'tasks', we need raw SQL
        const tasks = await prisma.$queryRaw`SELECT * FROM "tasks" LIMIT 5`;
        console.log(`Found ${tasks.length} rows in "tasks" table.`);
        if (tasks.length > 0) {
            console.log('Sample data:', tasks[0]);
        }
    } catch (error) {
        console.error('Error querying "tasks":', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
