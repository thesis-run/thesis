-- Phase 1: Delete the blank draft that was accidentally created
DELETE FROM petition_content WHERE id = '6c14518c-fee9-4e91-bf93-94010081fea2';

-- Phase 2: Add new columns for single-document architecture
ALTER TABLE petition_content ADD COLUMN IF NOT EXISTS published_content jsonb;
ALTER TABLE petition_content ADD COLUMN IF NOT EXISTS published_version integer;

-- Phase 3: Migrate published content to the main draft row
UPDATE petition_content 
SET published_content = (
  SELECT content FROM petition_content WHERE is_draft = false AND is_published = true LIMIT 1
),
published_version = (
  SELECT version FROM petition_content WHERE is_draft = false AND is_published = true LIMIT 1
),
is_published = true
WHERE id = 'cb1b6fbe-b6f5-426f-8dbd-c3cc690f7495';

-- Phase 4: Delete the separate published row (no longer needed)
DELETE FROM petition_content WHERE is_draft = false AND id != 'cb1b6fbe-b6f5-426f-8dbd-c3cc690f7495';

-- Phase 5: Remove is_draft column (no longer needed in single-document model)
ALTER TABLE petition_content DROP COLUMN IF EXISTS is_draft;