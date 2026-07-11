-- Why It Moved Engine sandbox extension.
-- Apply after supabase/market-simulations.sql.

ALTER TABLE market_simulations
  ADD COLUMN IF NOT EXISTS short_explanation TEXT,
  ADD COLUMN IF NOT EXISTS detailed_explanation TEXT,
  ADD COLUMN IF NOT EXISTS explanation_trace JSONB;

UPDATE market_simulations
SET
  short_explanation = COALESCE(short_explanation, reason),
  detailed_explanation = COALESCE(detailed_explanation, reason),
  explanation_trace = COALESCE(explanation_trace, '[]'::jsonb)
WHERE short_explanation IS NULL
   OR detailed_explanation IS NULL
   OR explanation_trace IS NULL;

ALTER TABLE market_simulations
  ALTER COLUMN short_explanation SET NOT NULL,
  ALTER COLUMN detailed_explanation SET NOT NULL,
  ALTER COLUMN explanation_trace SET NOT NULL,
  ALTER COLUMN explanation_trace SET DEFAULT '[]'::jsonb;

ALTER TABLE market_simulations
  DROP CONSTRAINT IF EXISTS market_simulations_explanation_trace_array;
ALTER TABLE market_simulations
  ADD CONSTRAINT market_simulations_explanation_trace_array
    CHECK (jsonb_typeof(explanation_trace) = 'array');

COMMENT ON COLUMN market_simulations.explanation_trace IS
  'Structured sandbox-only audit trail for every Price Engine v2 movement.';
