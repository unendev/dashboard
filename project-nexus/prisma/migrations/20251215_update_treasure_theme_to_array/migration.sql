-- Update the theme column from String to String[] (text to text[])
-- First, create a backup of the current data
ALTER TABLE "treasures" 
ADD COLUMN "theme_backup" TEXT;

-- Copy existing data to backup
UPDATE "treasures" 
SET "theme_backup" = "theme";

-- Drop the old theme column
ALTER TABLE "treasures" 
DROP COLUMN "theme";

-- Create new theme column as text array with default empty array
ALTER TABLE "treasures" 
ADD COLUMN "theme" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate data from backup: convert single string values to array
UPDATE "treasures" 
SET "theme" = CASE 
  WHEN "theme_backup" IS NOT NULL AND "theme_backup" != '' THEN ARRAY["theme_backup"]::TEXT[]
  ELSE ARRAY[]::TEXT[]
END;

-- Drop the backup column
ALTER TABLE "treasures" 
DROP COLUMN "theme_backup";
