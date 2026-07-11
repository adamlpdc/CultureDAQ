-- Replay & Balancing Lab sandbox only.
-- Stores complete immutable run snapshots for configuration comparison.

CREATE TABLE IF NOT EXISTS replay_lab_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  balance_config JSONB NOT NULL CHECK (jsonb_typeof(balance_config) = 'object'),
  statistics JSONB NOT NULL CHECK (jsonb_typeof(statistics) = 'object'),
  simulation_results JSONB NOT NULL CHECK (jsonb_typeof(simulation_results) = 'array'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE replay_lab_runs IS
  'Sandbox-only Market Engine v2 replay snapshots. No production pricing side effects.';

CREATE INDEX IF NOT EXISTS replay_lab_runs_created_at_idx
  ON replay_lab_runs (created_at DESC);

ALTER TABLE replay_lab_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE replay_lab_runs FROM anon, authenticated;
