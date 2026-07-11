-- Expectation Engine sandbox only. Apply after supabase/culture-events.sql.
-- No triggers or foreign keys touch production pricing tables.

CREATE TABLE IF NOT EXISTS asset_expectations (
  asset_slug TEXT PRIMARY KEY,
  asset_name TEXT NOT NULL,
  expectation_score NUMERIC(6,2) NOT NULL CHECK (expectation_score BETWEEN 0 AND 100),
  previous_score NUMERIC(6,2) NOT NULL CHECK (previous_score BETWEEN 0 AND 100),
  decay_half_life_hours NUMERIC(8,2) NOT NULL CHECK (decay_half_life_hours > 0),
  contributing_event_ids UUID[] NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_expectation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_slug TEXT NOT NULL,
  expectation_score NUMERIC(6,2) NOT NULL CHECK (expectation_score BETWEEN 0 AND 100),
  reason TEXT NOT NULL CHECK (reason IN ('event', 'decay', 'recalculation')),
  culture_event_id UUID REFERENCES culture_events(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE asset_expectations IS
  'Sandbox-only current Culture Intelligence expectation scores.';
COMMENT ON TABLE asset_expectation_history IS
  'Sandbox-only expectation score snapshots; never consumed by production pricing.';

CREATE INDEX IF NOT EXISTS asset_expectation_history_asset_time_idx
  ON asset_expectation_history (asset_slug, recorded_at DESC);

ALTER TABLE asset_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_expectation_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE asset_expectations FROM anon, authenticated;
REVOKE ALL ON TABLE asset_expectation_history FROM anon, authenticated;
