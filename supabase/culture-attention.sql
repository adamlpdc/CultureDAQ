-- Attention Engine sandbox only. Apply after supabase/culture-events.sql.
-- These outputs are intentionally not connected to any price or trading table.

ALTER TABLE culture_events
  ADD COLUMN IF NOT EXISTS actual_attention NUMERIC(3,2)
    CHECK (actual_attention BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS surprise_delta NUMERIC(4,2)
    CHECK (surprise_delta BETWEEN -4 AND 4),
  ADD COLUMN IF NOT EXISTS momentum_score NUMERIC(6,2)
    CHECK (momentum_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS viral_multiplier NUMERIC(5,3)
    CHECK (viral_multiplier BETWEEN 0.5 AND 3),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE culture_events
  DROP CONSTRAINT IF EXISTS culture_events_resolution_complete;

ALTER TABLE culture_events
  ADD CONSTRAINT culture_events_resolution_complete CHECK (
    (resolved_at IS NULL AND actual_attention IS NULL AND surprise_delta IS NULL
      AND momentum_score IS NULL AND viral_multiplier IS NULL)
    OR
    (resolved_at IS NOT NULL AND actual_attention IS NOT NULL AND surprise_delta IS NOT NULL
      AND momentum_score IS NOT NULL AND viral_multiplier IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS culture_events_resolved_at_idx
  ON culture_events (resolved_at DESC) WHERE resolved_at IS NOT NULL;
