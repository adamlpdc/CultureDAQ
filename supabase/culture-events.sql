-- Culture Intelligence Engine sandbox only.
-- This table is deliberately not referenced by the production price engine.

CREATE TABLE IF NOT EXISTS culture_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'announcement', 'release', 'performance', 'award', 'controversy',
    'viral_moment', 'sports_result', 'partnership'
  )),
  affected_assets JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(affected_assets) = 'array'),
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  expected_attention NUMERIC(6,2) NOT NULL CHECK (expected_attention BETWEEN 0 AND 100),
  predicted_attention NUMERIC(6,2) NOT NULL CHECK (predicted_attention BETWEEN 0 AND 100),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  reach BIGINT NOT NULL DEFAULT 0 CHECK (reach >= 0),
  time_to_peak_hours NUMERIC(8,2) NOT NULL CHECK (time_to_peak_hours >= 0),
  decay_rate NUMERIC(6,4) NOT NULL CHECK (decay_rate BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN (
    'detected', 'assessing', 'active', 'peaked', 'decaying', 'archived'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE culture_events IS
  'Sandbox-only cultural signals. Isolated from production market and pricing logic.';

CREATE INDEX IF NOT EXISTS culture_events_status_idx ON culture_events (status);
CREATE INDEX IF NOT EXISTS culture_events_event_type_idx ON culture_events (event_type);
CREATE INDEX IF NOT EXISTS culture_events_created_at_idx ON culture_events (created_at DESC);

ALTER TABLE culture_events ENABLE ROW LEVEL SECURITY;

-- Browser clients cannot access this sandbox table. The admin page reads through
-- the server-side service-role repository only when the feature is enabled.
REVOKE ALL ON TABLE culture_events FROM anon, authenticated;
