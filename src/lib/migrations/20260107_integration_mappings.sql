-- ================================================
-- Integration Mappings Table
-- Maps external accounts to internal accounts (1:N relationship)
-- ================================================
-- One integration can have multiple external accounts
-- Each external account maps to one internal account
-- ================================================

CREATE TABLE IF NOT EXISTS integration_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  external_account_id TEXT NOT NULL,
  external_account_name TEXT NOT NULL,
  internal_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure no duplicate mappings for same external account within an integration
  UNIQUE(integration_id, external_account_id)
);

-- ================================================
-- INDEXES for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_integration_mappings_integration ON integration_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_mappings_internal_account ON integration_mappings(internal_account_id);

-- ================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ================================================
DROP TRIGGER IF EXISTS update_integration_mappings_updated_at ON integration_mappings;
CREATE TRIGGER update_integration_mappings_updated_at
  BEFORE UPDATE ON integration_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================
ALTER TABLE integration_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own integration mappings" ON integration_mappings;
CREATE POLICY "Users can view own integration mappings"
  ON integration_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = integration_mappings.integration_id
      AND integrations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own integration mappings" ON integration_mappings;
CREATE POLICY "Users can create own integration mappings"
  ON integration_mappings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = integration_mappings.integration_id
      AND integrations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own integration mappings" ON integration_mappings;
CREATE POLICY "Users can update own integration mappings"
  ON integration_mappings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = integration_mappings.integration_id
      AND integrations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own integration mappings" ON integration_mappings;
CREATE POLICY "Users can delete own integration mappings"
  ON integration_mappings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = integration_mappings.integration_id
      AND integrations.user_id = auth.uid()
    )
  );
