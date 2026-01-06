# Database Migration Guide

## Overview
This guide covers running database migrations for Project Nexus using Prisma ORM in the Docker environment.

## 1. Prerequisites

### [ ] Verify containers are running
```bash
cd /opt/project-nexus/deployment/docker

# Check if app and db containers are running
docker-compose ps

# Expected output:
# NAME                      COMMAND                  SERVICE   STATUS        PORTS
# project-nexus-app-1       "docker-entrypoint.s…"   app       Up 2 minutes  0.0.0.0:3000->3000/tcp
# project-nexus-db-1        "docker-entrypoint.s…"   db        Up 2 minutes  5432/tcp
```

### [ ] Check database connectivity
```bash
# Test database connection from app container
docker-compose exec app node -e "
console.log('Testing database connection...');
require('child_process').execSync('npx prisma db execute --stdin <<< \"SELECT 1\"', { stdio: 'inherit' });
"
```

## 2. Migration Methods

### Method A: Using Prisma Migrate (Recommended)
```bash
# Run migrations inside app container
docker-compose exec app npm run db:migrate

# This executes: prisma migrate deploy
```

### Method B: Manual migration steps
```bash
# 1. Generate Prisma Client
docker-compose exec app npx prisma generate

# 2. Apply migrations
docker-compose exec app npx prisma migrate deploy

# 3. Verify migration
docker-compose exec app npx prisma migrate status
```

### Method C: Direct database access
```bash
# Access PostgreSQL directly
docker-compose exec db psql -U project_nexus_user -d project_nexus

# In psql, check migrations table
\dt
SELECT * FROM "_prisma_migrations";
```

## 3. Migration Script

Create a comprehensive migration script:

```bash
#!/bin/bash
# migrate-database.sh

set -e  # Exit on error

echo "=== Database Migration ==="
echo "Timestamp: $(date)"
echo ""

cd /opt/project-nexus/deployment/docker

echo "1. Checking database connection..."
docker-compose exec db pg_isready -U project_nexus_user -d project_nexus

echo "2. Checking existing migrations..."
docker-compose exec app npx prisma migrate status

echo "3. Applying migrations..."
docker-compose exec app npx prisma migrate deploy

echo "4. Generating Prisma Client..."
docker-compose exec app npx prisma generate

echo "5. Verifying migration..."
docker-compose exec app npx prisma migrate status

echo "6. Testing database access..."
docker-compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    await prisma.\$connect();
    console.log('✓ Database connection successful');
    
    // Test a simple query
    const count = await prisma.user.count();
    console.log(\`✓ Users in database: \${count}\`);
  } catch (error) {
    console.error('✗ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}
test();
"

echo ""
echo "=== Migration Complete ==="
```

Make it executable:
```bash
chmod +x /opt/project-nexus/migrate-database.sh
```

## 4. Verification Steps

### [ ] Verify migration success
```bash
# Check migration status
docker-compose exec app npx prisma migrate status

# Expected output should show all migrations as applied
# ✔ 20250101000000_initial_migration
# ✔ 20250102000000_add_user_profile
# ...
```

### [ ] Verify database schema
```bash
# List all tables
docker-compose exec app npx prisma db execute --stdin <<< "\dt"

# Or using Prisma Studio (for visual inspection)
# docker-compose exec app npx prisma studio &
```

### [ ] Test data access
```bash
# Test creating a test record
docker-compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Try to count records in each table
    const tables = ['User', 'TimerTask', 'Todo', 'Treasure'];
    for (const table of tables) {
      try {
        const count = await prisma[table].count();
        console.log(\`\${table}: \${count} records\`);
      } catch (e) {
        console.log(\`\${table}: Table accessible\`);
      }
    }
  } finally {
    await prisma.\$disconnect();
  }
}
test();
"
```

## 5. Troubleshooting Migrations

### Issue 1: Migration conflicts
```bash
# Reset database (DANGEROUS - only for development)
docker-compose exec app npx prisma migrate reset --force

# Or manually drop and recreate
docker-compose down -v  # Removes volumes including database
docker-compose up -d
```

### Issue 2: Prisma Client not generated
```bash
# Manually generate Prisma Client
docker-compose exec app npx prisma generate

# Check if node_modules has @prisma/client
docker-compose exec app ls -la node_modules/@prisma/
```

### Issue 3: Database connection errors
```bash
# Check environment variables
docker-compose exec app printenv | grep DATABASE

# Test connection directly
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "SELECT version();"
```

### Issue 4: Migration already applied
```bash
# Check migration history
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "SELECT * FROM \"_prisma_migrations\" ORDER BY \"finished_at\" DESC;"

# If migration failed midway, you may need to:
docker-compose exec app npx prisma migrate resolve --applied <migration_name>
```

## 6. Database Backup Before Migration

### [ ] Create pre-migration backup
```bash
#!/bin/bash
# backup-before-migration.sh

BACKUP_DIR="/opt/backups/db-pre-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

cd /opt/project-nexus/deployment/docker

echo "Creating database backup..."
docker-compose exec db pg_dump -U project_nexus_user \
  --format=custom \
  --file=/tmp/db-backup.dump \
  project_nexus

# Copy backup from container to host
docker cp $(docker-compose ps -q db):/tmp/db-backup.dump $BACKUP_DIR/

echo "Backup created: $BACKUP_DIR/db-backup.dump"
echo "Size: $(du -h $BACKUP_DIR/db-backup.dump | cut -f1)"
```

## 7. Rollback Procedure

### [ ] Rollback to previous migration
```bash
# Method 1: Use database backup
docker-compose stop app db
docker-compose rm -f db
docker volume rm project-nexus_postgres_data
docker-compose up -d db

# Restore from backup
docker-compose exec -T db pg_restore -U project_nexus_user \
  --clean --if-exists \
  --dbname=project_nexus \
  < /path/to/backup.dump

# Method 2: Manual SQL rollback (if simple)
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "
-- Example: Drop recently added table
DROP TABLE IF EXISTS new_table;
-- Remove migration record
DELETE FROM \"_prisma_migrations\" WHERE migration_name = '20250101000000_add_new_table';
"
```

## 8. Production Migration Best Practices

### [ ] Always backup before migration
```bash
# Automated backup script
0 2 * * * /opt/project-nexus/backup-database.sh
```

### [ ] Test migrations in staging first
```bash
# Use separate environment for testing
cp docker-compose.yml docker-compose.staging.yml
# Modify for staging environment
```

### [ ] Monitor migration progress
```bash
# Watch migration logs
docker-compose logs -f app | grep -i "migrate\|prisma\|database"

# Check database locks during migration
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "
SELECT pid, usename, pg_blocking_pids(pid) as blocked_by, query, age(clock_timestamp(), query_start) as age
FROM pg_stat_activity
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY age DESC;
"
```

### [ ] Schedule migrations during low traffic
```bash
# Example: Run migrations at 2 AM
0 2 * * * cd /opt/project-nexus/deployment/docker && ./migrate-database.sh >> /var/log/project-nexus-migration.log 2>&1
```

## 9. Data Seeding (Optional)

### [ ] Seed initial data
```bash
# If you have seed scripts
docker-compose exec app npm run seed-demo

# Or manually seed
docker-compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  // Create admin user if not exists
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@example.com' }
  });
  
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        // ... other fields
      }
    });
    console.log('Admin user created');
  }
}

seed().finally(() => prisma.\$disconnect());
"
```

## 10. Performance Considerations

### [ ] Index optimization after migration
```bash
# Analyze table performance
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "
ANALYZE;
"

# Check for missing indexes
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "
SELECT schemaname, tablename, attname, null_frac, avg_width, n_distinct
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n_distinct DESC;
"
```

### [ ] Vacuum database after large migrations
```bash
# Vacuum to reclaim space and update statistics
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "VACUUM ANALYZE;"
```

## 11. Success Verification Checklist

### [ ] Complete migration verification
```bash
#!/bin/bash
# verify-migration.sh

echo "=== Migration Verification ==="

# 1. Check migration status
echo "1. Migration status:"
docker-compose exec app npx prisma migrate status

# 2. Verify Prisma Client
echo "2. Prisma Client:"
docker-compose exec app ls node_modules/.prisma/client/

# 3. Test database connection
echo "3. Database connection test:"
docker-compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✓ Connected successfully'))
  .catch(e => console.log('✗ Connection failed:', e.message))
  .finally(() => prisma.\$disconnect());
"

# 4. Verify core tables exist
echo "4. Core tables:"
TABLES=("User" "TimerTask" "Todo" "Treasure" "Category")
for table in "${TABLES[@]}"; do
  docker-compose exec app node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$queryRaw\`SELECT COUNT(*) FROM \\\"${table}\\\"\`
    .then(result => console.log(\`✓ ${table}: \${result[0].count} rows\`))
    .catch(() => console.log(\`✗ ${table}: Table not found\`))
    .finally(() => prisma.\$disconnect());
  "
done

echo "=== Verification Complete ==="
```

## Next Steps
After successful database migration:
1. Configure Nginx reverse proxy
2. Set up SSL certificates
3. Test application functionality with real data
4. Monitor database performance