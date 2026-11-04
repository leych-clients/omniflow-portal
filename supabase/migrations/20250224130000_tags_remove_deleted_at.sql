-- Remove deleted_at from tags (we use hard delete now).
-- Drop the policy first: it references deleted_at, so dropping the column
-- before the policy fails on a from-scratch replay.
DROP POLICY IF EXISTS "tags_select" ON tags;

ALTER TABLE tags DROP COLUMN IF EXISTS deleted_at;

-- Update RLS policy to allow all tags (no deleted_at filter)
CREATE POLICY "tags_select" ON tags FOR SELECT TO authenticated USING (true);
