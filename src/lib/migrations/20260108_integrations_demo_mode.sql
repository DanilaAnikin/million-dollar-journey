-- ================================================
-- Add is_demo column to integrations table
-- For Trading 212 demo/practice account support
-- ================================================

ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- ================================================
-- Comment for documentation
-- ================================================
COMMENT ON COLUMN integrations.is_demo IS 'When true, use demo/practice environment for this integration';
