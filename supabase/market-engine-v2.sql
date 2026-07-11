-- Active Market Engine v2 audit, locking and idempotent price application.
-- Apply after culture-events, culture-expectations and market-rebalance migrations.

ALTER TABLE culture_events
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS market_engine_v2_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tick_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  engine_version TEXT NOT NULL DEFAULT 'v2',
  asset_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(errors) = 'array'),
  seven_day_drift_percent NUMERIC(10,6),
  drift_warning TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS market_engine_v2_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES market_engine_v2_runs(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  culture_event_id UUID REFERENCES culture_events(id) ON DELETE SET NULL,
  expectation_score NUMERIC(8,4) NOT NULL,
  expected_attention NUMERIC(8,4),
  actual_attention NUMERIC(8,4),
  surprise_delta NUMERIC(8,4) NOT NULL,
  signed_momentum NUMERIC(10,6) NOT NULL,
  trading_pressure NUMERIC(10,6) NOT NULL,
  event_impact NUMERIC(10,6) NOT NULL,
  momentum_impact NUMERIC(10,6) NOT NULL,
  random_impact NUMERIC(10,6) NOT NULL,
  old_price NUMERIC(18,4) NOT NULL,
  new_price NUMERIC(18,4) NOT NULL,
  final_percentage_move NUMERIC(10,6) NOT NULL,
  applied_caps JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(applied_caps) = 'array'),
  calculation_input JSONB NOT NULL,
  calculation_output JSONB NOT NULL,
  reason TEXT NOT NULL,
  detailed_explanation TEXT NOT NULL,
  applied BOOLEAN NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, asset_id)
);

ALTER TABLE market_engine_v2_runs
  ADD COLUMN IF NOT EXISTS errors JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS market_engine_v2_calculations_asset_time_idx
  ON market_engine_v2_calculations (asset_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS market_engine_v2_calculations_event_idx
  ON market_engine_v2_calculations (culture_event_id) WHERE culture_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS market_engine_v2_event_once_per_asset_idx
  ON market_engine_v2_calculations (culture_event_id, asset_id)
  WHERE culture_event_id IS NOT NULL;

ALTER TABLE market_engine_v2_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_engine_v2_calculations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON market_engine_v2_runs, market_engine_v2_calculations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION begin_market_engine_v2_run(p_tick_key TEXT)
RETURNS TABLE(run_id UUID, run_status TEXT, created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO market_engine_v2_runs (tick_key)
  VALUES (p_tick_key)
  ON CONFLICT (tick_key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, 'running'::TEXT, true;
  ELSE
    RETURN QUERY
      SELECT id, status, false
      FROM market_engine_v2_runs
      WHERE tick_key = p_tick_key;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION apply_market_engine_v2_calculation(
  p_run_id UUID,
  p_asset_id UUID,
  p_event_id UUID,
  p_input JSONB,
  p_output JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted UUID;
  v_apply BOOLEAN := COALESCE((p_output->>'material')::BOOLEAN, false);
  v_old_price NUMERIC := (p_input->>'oldPrice')::NUMERIC;
  v_new_price NUMERIC := (p_output->>'newPrice')::NUMERIC;
  v_calculated_at TIMESTAMPTZ := (p_input->>'calculatedAt')::TIMESTAMPTZ;
BEGIN
  INSERT INTO market_engine_v2_calculations (
    run_id, asset_id, culture_event_id, expectation_score,
    expected_attention, actual_attention, surprise_delta, signed_momentum,
    trading_pressure, event_impact, momentum_impact, random_impact,
    old_price, new_price, final_percentage_move, applied_caps,
    calculation_input, calculation_output, reason, detailed_explanation,
    applied, calculated_at
  ) VALUES (
    p_run_id, p_asset_id, p_event_id,
    COALESCE((p_input->>'expectationScore')::NUMERIC, 0),
    NULLIF(p_output->>'expectedAttention', '')::NUMERIC,
    NULLIF(p_output->>'actualAttention', '')::NUMERIC,
    COALESCE((p_output->>'surpriseDelta')::NUMERIC, 0),
    COALESCE((p_output->>'nextSignedMomentum')::NUMERIC, 0),
    COALESCE((p_output->>'tradingPressurePercent')::NUMERIC, 0),
    COALESCE((p_output->>'eventImpactPercent')::NUMERIC, 0),
    COALESCE((p_output->>'momentumImpactPercent')::NUMERIC, 0),
    COALESCE((p_output->>'randomImpactPercent')::NUMERIC, 0),
    v_old_price, v_new_price,
    COALESCE((p_output->>'finalPercentageMove')::NUMERIC, 0),
    COALESCE(p_output->'appliedCaps', '[]'::JSONB),
    p_input, p_output,
    COALESCE(p_output->>'reason', 'No explanation recorded'),
    COALESCE(p_output->>'detailedExplanation', 'No detailed explanation recorded'),
    v_apply, v_calculated_at
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN RETURN false; END IF;

  IF v_apply THEN
    UPDATE assets
    SET previous_price = v_old_price,
        current_price = v_new_price,
        momentum_score = COALESCE((p_output->>'nextSignedMomentum')::NUMERIC, 0),
        buy_pressure = buy_pressure * 0.5,
        sell_pressure = sell_pressure * 0.5,
        updated_at = v_calculated_at
    WHERE id = p_asset_id AND current_price = v_old_price;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Asset price changed during v2 calculation for %', p_asset_id;
    END IF;

    INSERT INTO asset_prices (asset_id, price, recorded_at)
    VALUES (p_asset_id, v_new_price, v_calculated_at);

    INSERT INTO price_events (
      asset_id, old_price, new_price, change_percent, reason, source, metadata
    ) VALUES (
      p_asset_id, v_old_price, v_new_price,
      (p_output->>'finalPercentageMove')::NUMERIC,
      p_output->>'reason', 'market_engine',
      jsonb_build_object(
        'engine_version', 'v2',
        'run_id', p_run_id,
        'culture_event_id', p_event_id,
        'calculation_id', v_inserted,
        'detailed_explanation', p_output->>'detailedExplanation',
        'applied_caps', p_output->'appliedCaps'
      )
    );
  ELSE
    UPDATE assets
    SET momentum_score = COALESCE((p_output->>'nextSignedMomentum')::NUMERIC, 0),
        buy_pressure = buy_pressure * 0.5,
        sell_pressure = sell_pressure * 0.5,
        updated_at = v_calculated_at
    WHERE id = p_asset_id;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION get_market_engine_v2_seven_day_drift()
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  WITH asset_days AS (
    SELECT asset_id, DATE_TRUNC('day', calculated_at) AS day,
      SUM(final_percentage_move) AS daily_move
    FROM market_engine_v2_calculations
    WHERE calculated_at >= NOW() - INTERVAL '7 days'
    GROUP BY asset_id, DATE_TRUNC('day', calculated_at)
  ), daily_market AS (
    SELECT day, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY daily_move) AS median_move
    FROM asset_days
    GROUP BY day
  )
  SELECT COALESCE(AVG(median_move), 0)::NUMERIC FROM daily_market;
$$;

DROP FUNCTION IF EXISTS finish_market_engine_v2_run(UUID, INTEGER, INTEGER, INTEGER, INTEGER, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION finish_market_engine_v2_run(
  p_run_id UUID,
  p_asset_count INTEGER,
  p_updated_count INTEGER,
  p_skipped_count INTEGER,
  p_error_count INTEGER,
  p_errors JSONB,
  p_drift NUMERIC,
  p_warning TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE market_engine_v2_runs
  SET status = CASE WHEN p_error_count > 0 THEN 'failed' ELSE 'completed' END,
      asset_count = p_asset_count,
      updated_count = p_updated_count, skipped_count = p_skipped_count,
      error_count = p_error_count,
      errors = COALESCE(p_errors, '[]'::jsonb),
      seven_day_drift_percent = p_drift, drift_warning = p_warning,
      completed_at = NOW()
  WHERE id = p_run_id;
$$;

REVOKE ALL ON FUNCTION begin_market_engine_v2_run(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_market_engine_v2_calculation(UUID, UUID, UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_market_engine_v2_seven_day_drift() FROM PUBLIC;
REVOKE ALL ON FUNCTION finish_market_engine_v2_run(UUID, INTEGER, INTEGER, INTEGER, INTEGER, JSONB, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION begin_market_engine_v2_run(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION apply_market_engine_v2_calculation(UUID, UUID, UUID, JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_market_engine_v2_seven_day_drift() TO service_role;
GRANT EXECUTE ON FUNCTION finish_market_engine_v2_run(UUID, INTEGER, INTEGER, INTEGER, INTEGER, JSONB, NUMERIC, TEXT) TO service_role;
