-- AlterTable: Add detailed_analysis field to posts and reddit_posts tables
-- This migration is safe - adds nullable fields, no data loss

-- Add detailed_analysis to posts table
ALTER TABLE "posts" ADD COLUMN "detailed_analysis" TEXT;

-- Add detailed_analysis to reddit_posts table
ALTER TABLE "reddit_posts" ADD COLUMN "detailed_analysis" TEXT;

