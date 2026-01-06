-- First, create the task_definitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "task_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryPath" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_definitions_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint from task_definitions to users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'task_definitions_userId_fkey'
    ) THEN
        ALTER TABLE "task_definitions" 
        ADD CONSTRAINT "task_definitions_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add unique constraint on userId, name, categoryPath
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'task_definitions_userId_name_categoryPath_key'
    ) THEN
        ALTER TABLE "task_definitions" 
        ADD CONSTRAINT "task_definitions_userId_name_categoryPath_key" 
        UNIQUE ("userId", "name", "categoryPath");
    END IF;
END $$;

-- Add the column to the timer_tasks table
ALTER TABLE "timer_tasks" ADD COLUMN IF NOT EXISTS "taskDefinitionId" TEXT;

-- Add the foreign key constraint
-- This links timer_tasks.taskDefinitionId to task_definitions.id
-- onDelete: SetNull ensures that if a TaskDefinition is deleted, the corresponding timerTasks' taskDefinitionId is set to NULL.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'timer_tasks_taskDefinitionId_fkey'
    ) THEN
        ALTER TABLE "timer_tasks" 
        ADD CONSTRAINT "timer_tasks_taskDefinitionId_fkey" 
        FOREIGN KEY ("taskDefinitionId") REFERENCES "task_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create an index on the new column to improve query performance for lookups.
CREATE INDEX IF NOT EXISTS "timer_tasks_taskDefinitionId_idx" ON "timer_tasks"("taskDefinitionId");