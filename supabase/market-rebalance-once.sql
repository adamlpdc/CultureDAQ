-- One-time market price redenomination.
-- Apply this migration first; it does not rebalance anything by itself.

ALTER TABLE holdings
  ALTER COLUMN shares TYPE NUMERIC(38,16) USING shares::NUMERIC(38,16),
  ALTER COLUMN avg_cost TYPE NUMERIC(38,16) USING avg_cost::NUMERIC(38,16);
ALTER TABLE assets
  ALTER COLUMN total_shares_outstanding TYPE NUMERIC(38,16)
  USING total_shares_outstanding::NUMERIC(38,16);

CREATE TABLE IF NOT EXISTS market_engine_controls (
  id TEXT PRIMARY KEY,
  paused BOOLEAN NOT NULL DEFAULT false,
  pause_reason TEXT,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO market_engine_controls (id) VALUES ('production') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS market_corporate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (action_type = 'market_reset_v1'),
  price_factor NUMERIC(38,16) NOT NULL CHECK (price_factor > 0),
  effective_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS market_corporate_actions_asset_time_idx
  ON market_corporate_actions (asset_id, effective_at);
ALTER TABLE market_corporate_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Corporate actions are publicly readable"
  ON market_corporate_actions FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS market_rebalance_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('applying', 'applied', 'failed')),
  asset_count INTEGER NOT NULL,
  plan JSONB NOT NULL,
  note TEXT,
  achievement_count_before BIGINT,
  achievement_count_after BIGINT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS market_rebalance_only_one_applied
  ON market_rebalance_runs ((status)) WHERE status = 'applied';

CREATE TABLE IF NOT EXISTS market_rebalance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES market_rebalance_runs(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  old_price NUMERIC(18,4) NOT NULL,
  new_price NUMERIC(18,4) NOT NULL,
  old_previous_price NUMERIC(18,4) NOT NULL,
  new_previous_price NUMERIC(18,4) NOT NULL,
  old_total_shares NUMERIC(38,16) NOT NULL,
  new_total_shares NUMERIC(38,16) NOT NULL,
  price_factor NUMERIC(38,16) NOT NULL,
  old_trading_paused BOOLEAN NOT NULL,
  old_rank INTEGER NOT NULL,
  new_rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, asset_id)
);

CREATE TABLE IF NOT EXISTS market_rebalance_portfolio_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES market_rebalance_runs(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  username TEXT NOT NULL,
  rank_before INTEGER NOT NULL,
  rank_after INTEGER NOT NULL,
  total_value_before NUMERIC(24,2) NOT NULL,
  total_value_after NUMERIC(24,2) NOT NULL,
  holdings_value_before NUMERIC(24,2) NOT NULL,
  holdings_value_after NUMERIC(24,2) NOT NULL,
  discrepancy NUMERIC(24,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, user_id)
);

CREATE TABLE IF NOT EXISTS player_reset_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_rebalance_run_id UUID NOT NULL REFERENCES market_rebalance_runs(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('applying', 'applied')),
  user_count INTEGER NOT NULL,
  holdings_removed BIGINT NOT NULL DEFAULT 0,
  trades_removed BIGINT NOT NULL DEFAULT 0,
  notifications_removed BIGINT NOT NULL DEFAULT 0,
  achievements_reset BIGINT NOT NULL DEFAULT 0,
  reset_achievements_unlocked_before BIGINT NOT NULL DEFAULT 0,
  reset_achievements_unlocked_after BIGINT NOT NULL DEFAULT 0,
  preserved_achievements_unlocked_before BIGINT NOT NULL DEFAULT 0,
  preserved_achievements_unlocked_after BIGINT NOT NULL DEFAULT 0,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS player_reset_only_one_applied
  ON player_reset_runs ((status)) WHERE status = 'applied';

CREATE TABLE IF NOT EXISTS player_reset_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES player_reset_runs(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  previous_balance NUMERIC(24,2) NOT NULL,
  previous_holdings_value NUMERIC(24,2) NOT NULL,
  previous_portfolio_value NUMERIC(24,2) NOT NULL,
  previous_holdings_count INTEGER NOT NULL,
  previous_trade_count INTEGER NOT NULL,
  reset_achievement_count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL,
  UNIQUE (run_id, user_id)
);

ALTER TABLE market_rebalance_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_rebalance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_rebalance_portfolio_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_reset_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_reset_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON market_rebalance_runs, market_rebalance_assets,
  market_rebalance_portfolio_audit, player_reset_runs, player_reset_audit,
  market_engine_controls FROM anon, authenticated;

CREATE OR REPLACE FUNCTION apply_market_rebalance(
  p_plan JSONB,
  p_confirmation TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID;
  v_asset_count INTEGER;
  v_plan_count INTEGER;
  v_recorded_at TIMESTAMPTZ := NOW();
  v_achievement_count_before BIGINT;
  v_achievement_count_after BIGINT;
BEGIN
  IF p_confirmation <> 'REBALANCE_MARKET_ONCE' THEN
    RAISE EXCEPTION 'Invalid rebalance confirmation';
  END IF;
  IF EXISTS (SELECT 1 FROM market_rebalance_runs WHERE status = 'applied') THEN
    RAISE EXCEPTION 'Market rebalance has already been applied';
  END IF;

  SELECT COUNT(*) INTO v_asset_count FROM assets;
  SELECT jsonb_array_length(COALESCE(p_plan->'assets', '[]'::jsonb)) INTO v_plan_count;
  IF v_plan_count <> v_asset_count OR v_asset_count = 0 THEN
    RAISE EXCEPTION 'Plan asset count (%) does not match live asset count (%)', v_plan_count, v_asset_count;
  END IF;

  CREATE TEMP TABLE rebalance_plan (
    asset_id UUID PRIMARY KEY,
    old_price NUMERIC(18,4),
    new_price NUMERIC(18,4),
    old_previous_price NUMERIC(18,4),
    new_previous_price NUMERIC(18,4),
    old_total_shares NUMERIC(38,16),
    new_total_shares NUMERIC(38,16),
    price_factor NUMERIC(38,16),
    old_rank INTEGER,
    new_rank INTEGER
  ) ON COMMIT DROP;

  INSERT INTO rebalance_plan
  SELECT * FROM jsonb_to_recordset(p_plan->'assets') AS x(
    asset_id UUID,
    old_price NUMERIC(18,4),
    new_price NUMERIC(18,4),
    old_previous_price NUMERIC(18,4),
    new_previous_price NUMERIC(18,4),
    old_total_shares NUMERIC(38,16),
    new_total_shares NUMERIC(38,16),
    price_factor NUMERIC(38,16),
    old_rank INTEGER,
    new_rank INTEGER
  );

  IF EXISTS (
    SELECT 1 FROM assets a
    LEFT JOIN rebalance_plan p ON p.asset_id = a.id
    WHERE p.asset_id IS NULL
       OR ROUND(a.current_price, 4) <> ROUND(p.old_price, 4)
       OR ROUND(a.previous_price, 4) <> ROUND(p.old_previous_price, 4)
       OR p.new_price <= 0 OR p.new_previous_price <= 0 OR p.price_factor <= 0
       OR p.old_rank <> p.new_rank
  ) THEN
    RAISE EXCEPTION 'Plan is stale, invalid, or does not preserve asset ranks';
  END IF;

  CREATE TEMP TABLE top_portfolios_before ON COMMIT DROP AS
  SELECT *, ROW_NUMBER() OVER (ORDER BY total_value DESC, user_id)::INTEGER AS rank
  FROM (
    SELECT p.user_id, p.username, p.daq_balance,
      ROUND(COALESCE(SUM(h.shares * a.current_price), 0), 2) AS holdings_value,
      ROUND(p.daq_balance + COALESCE(SUM(h.shares * a.current_price), 0), 2) AS total_value
    FROM profiles p
    LEFT JOIN holdings h ON h.user_id = p.user_id
    LEFT JOIN assets a ON a.id = h.asset_id
    GROUP BY p.user_id, p.username, p.daq_balance
  ) totals
  ORDER BY total_value DESC, user_id
  LIMIT 100;

  SELECT COUNT(*) INTO v_achievement_count_before FROM user_achievements WHERE is_unlocked = true;

  UPDATE market_engine_controls
  SET paused = true,
      pause_reason = 'Market Reset v1.0 migration and validation',
      paused_at = v_recorded_at,
      resumed_at = NULL,
      updated_at = v_recorded_at
  WHERE id = 'production';

  INSERT INTO market_rebalance_runs (status, asset_count, plan, note)
  VALUES ('applying', v_asset_count, p_plan, p_note)
  RETURNING id INTO v_run_id;

  INSERT INTO market_rebalance_assets (
    run_id, asset_id, old_price, new_price, old_previous_price,
    new_previous_price, old_total_shares, new_total_shares,
    price_factor, old_trading_paused, old_rank, new_rank
  )
  SELECT v_run_id, asset_id, old_price, new_price, old_previous_price,
    new_previous_price, old_total_shares, new_total_shares,
    p.price_factor, a.trading_paused, p.old_rank, p.new_rank
  FROM rebalance_plan p
  JOIN assets a ON a.id = p.asset_id;

  -- Stock-split-style compensation preserves every holding's current value,
  -- cost basis, portfolio allocation, total value, and player ranking.
  UPDATE holdings h
  SET
    shares = ROUND(h.shares / p.price_factor, 16),
    avg_cost = ROUND(h.avg_cost * p.price_factor, 16)
  FROM rebalance_plan p
  WHERE h.asset_id = p.asset_id;

  UPDATE assets a
  SET
    current_price = p.new_price,
    previous_price = p.new_previous_price,
    total_shares_outstanding = p.new_total_shares
  FROM rebalance_plan p
  WHERE a.id = p.asset_id;

  UPDATE assets SET trading_paused = true;

  INSERT INTO market_corporate_actions (
    asset_id, action_type, price_factor, effective_at, metadata
  )
  SELECT asset_id, 'market_reset_v1', price_factor, v_recorded_at,
    jsonb_build_object('run_id', v_run_id, 'old_price', old_price, 'new_price', new_price)
  FROM rebalance_plan;

  CREATE TEMP TABLE top_portfolios_after ON COMMIT DROP AS
  SELECT *, ROW_NUMBER() OVER (ORDER BY total_value DESC, user_id)::INTEGER AS rank
  FROM (
    SELECT p.user_id, p.username, p.daq_balance,
      ROUND(COALESCE(SUM(h.shares * a.current_price), 0), 2) AS holdings_value,
      ROUND(p.daq_balance + COALESCE(SUM(h.shares * a.current_price), 0), 2) AS total_value
    FROM profiles p
    LEFT JOIN holdings h ON h.user_id = p.user_id
    LEFT JOIN assets a ON a.id = h.asset_id
    GROUP BY p.user_id, p.username, p.daq_balance
  ) totals
  ORDER BY total_value DESC, user_id
  LIMIT 100;

  IF EXISTS (
    SELECT 1
    FROM top_portfolios_before b
    FULL JOIN top_portfolios_after a USING (user_id)
    WHERE b.user_id IS NULL OR a.user_id IS NULL
       OR b.rank <> a.rank
       OR b.total_value <> a.total_value
       OR b.holdings_value <> a.holdings_value
  ) THEN
    RAISE EXCEPTION 'Top-100 portfolio value or ranking invariant failed';
  END IF;

  INSERT INTO market_rebalance_portfolio_audit (
    run_id, user_id, username, rank_before, rank_after,
    total_value_before, total_value_after,
    holdings_value_before, holdings_value_after, discrepancy
  )
  SELECT v_run_id, b.user_id, b.username, b.rank, a.rank,
    b.total_value, a.total_value, b.holdings_value, a.holdings_value,
    a.total_value - b.total_value
  FROM top_portfolios_before b
  JOIN top_portfolios_after a USING (user_id);

  SELECT COUNT(*) INTO v_achievement_count_after FROM user_achievements WHERE is_unlocked = true;
  IF v_achievement_count_before <> v_achievement_count_after THEN
    RAISE EXCEPTION 'Unlocked achievement invariant failed';
  END IF;

  INSERT INTO asset_rank_history (
    asset_id, rank, previous_rank, rank_change,
    portfolio_value_basis, price, recorded_at
  )
  SELECT asset_id, new_rank, old_rank, old_rank - new_rank,
    new_price, new_price, v_recorded_at
  FROM rebalance_plan;

  INSERT INTO portfolio_snapshots (user_id, total_value, daq_balance, holdings_value, recorded_at)
  SELECT
    p.user_id,
    ROUND(p.daq_balance + COALESCE(SUM(h.shares * a.current_price), 0), 2),
    p.daq_balance,
    ROUND(COALESCE(SUM(h.shares * a.current_price), 0), 2),
    v_recorded_at
  FROM profiles p
  LEFT JOIN holdings h ON h.user_id = p.user_id
  LEFT JOIN assets a ON a.id = h.asset_id
  GROUP BY p.user_id, p.daq_balance;

  INSERT INTO leaderboard_snapshots (user_id, username, total_value, rank, recorded_at)
  SELECT user_id, username, total_value,
    ROW_NUMBER() OVER (ORDER BY total_value DESC, user_id),
    v_recorded_at
  FROM (
    SELECT p.user_id, p.username,
      ROUND(p.daq_balance + COALESCE(SUM(h.shares * a.current_price), 0), 2) AS total_value
    FROM profiles p
    LEFT JOIN holdings h ON h.user_id = p.user_id
    LEFT JOIN assets a ON a.id = h.asset_id
    GROUP BY p.user_id, p.username, p.daq_balance
  ) totals;

  UPDATE market_rebalance_runs
  SET status = 'applied', applied_at = v_recorded_at,
      achievement_count_before = v_achievement_count_before,
      achievement_count_after = v_achievement_count_after
  WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;

REVOKE ALL ON FUNCTION apply_market_rebalance(JSONB, TEXT, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION apply_market_and_player_reset(
  p_plan JSONB,
  p_confirmation TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market_run_id UUID;
  v_player_run_id UUID;
  v_reset_at TIMESTAMPTZ := NOW();
  v_user_count INTEGER;
  v_holdings_removed BIGINT;
  v_trades_removed BIGINT;
  v_notifications_removed BIGINT;
  v_achievements_reset BIGINT;
  v_reset_unlocked_before BIGINT;
  v_reset_unlocked_after BIGINT;
  v_preserved_unlocked_before BIGINT;
  v_preserved_unlocked_after BIGINT;
BEGIN
  IF p_confirmation <> 'MARKET_AND_PLAYER_RESET_V1' THEN
    RAISE EXCEPTION 'Invalid combined reset confirmation';
  END IF;

  -- Nested function work participates in this transaction. Any player-reset
  -- validation failure rolls the market rebalance back as well.
  v_market_run_id := apply_market_rebalance(
    p_plan,
    'REBALANCE_MARKET_ONCE',
    COALESCE(p_note, 'Market Reset v1.0 and full player reset')
  );

  SELECT COUNT(*) INTO v_user_count FROM profiles;
  INSERT INTO player_reset_runs (
    market_rebalance_run_id, status, user_count
  ) VALUES (v_market_run_id, 'applying', v_user_count)
  RETURNING id INTO v_player_run_id;

  CREATE TEMP TABLE reset_achievement_ids ON COMMIT DROP AS
  SELECT id
  FROM achievements
  WHERE requirement_type IN (
    'trade_count', 'buy_count', 'profitable_holding', 'profitable_holdings',
    'all_holdings_profitable', 'unique_assets', 'unique_categories',
    'portfolio_value', 'discovery_rank', 'leaderboard_rank',
    'category_holdings', 'hold_days', 'contrarian', 'perfect_timing'
  );

  SELECT COUNT(*) INTO v_reset_unlocked_before
  FROM user_achievements
  WHERE is_unlocked = true
    AND achievement_id IN (SELECT id FROM reset_achievement_ids);
  SELECT COUNT(*) INTO v_preserved_unlocked_before
  FROM user_achievements
  WHERE is_unlocked = true
    AND achievement_id NOT IN (SELECT id FROM reset_achievement_ids);

  INSERT INTO player_reset_audit (
    run_id, user_id, previous_balance, previous_holdings_value,
    previous_portfolio_value, previous_holdings_count,
    previous_trade_count, reset_achievement_count, reset_at
  )
  SELECT
    v_player_run_id,
    p.user_id,
    p.daq_balance,
    ROUND(COALESCE((
      SELECT SUM(h.shares * a.current_price)
      FROM holdings h JOIN assets a ON a.id = h.asset_id
      WHERE h.user_id = p.user_id
    ), 0), 2),
    ROUND(p.daq_balance + COALESCE((
      SELECT SUM(h.shares * a.current_price)
      FROM holdings h JOIN assets a ON a.id = h.asset_id
      WHERE h.user_id = p.user_id
    ), 0), 2),
    (SELECT COUNT(*) FROM holdings h WHERE h.user_id = p.user_id)::INTEGER,
    (SELECT COUNT(*) FROM trades t WHERE t.user_id = p.user_id)::INTEGER,
    (
      SELECT COUNT(*)
      FROM user_achievements ua
      WHERE ua.user_id = p.user_id AND ua.is_unlocked = true
        AND ua.achievement_id IN (SELECT id FROM reset_achievement_ids)
    )::INTEGER,
    v_reset_at
  FROM profiles p;

  -- A favorite badge depending on erased market progress is no longer valid.
  UPDATE profiles p
  SET favorite_achievement_id = NULL
  WHERE favorite_achievement_id IN (SELECT id FROM reset_achievement_ids);

  UPDATE user_achievements ua
  SET progress = 0, is_unlocked = false, unlocked_at = NULL, updated_at = v_reset_at
  WHERE achievement_id IN (SELECT id FROM reset_achievement_ids);
  GET DIAGNOSTICS v_achievements_reset = ROW_COUNT;

  DELETE FROM holdings;
  GET DIAGNOSTICS v_holdings_removed = ROW_COUNT;
  UPDATE assets SET total_shares_outstanding = 0;
  DELETE FROM trades;
  GET DIAGNOSTICS v_trades_removed = ROW_COUNT;

  DELETE FROM notifications n
  WHERE n.type IN (
    'watchlist_alert', 'rank_event', 'market_event',
    'portfolio_event', 'leaderboard_event'
  ) OR (
    n.type = 'achievement_unlocked'
    AND n.achievement_id IN (SELECT id FROM reset_achievement_ids)
  );
  GET DIAGNOSTICS v_notifications_removed = ROW_COUNT;

  DELETE FROM portfolio_snapshots;
  DELETE FROM leaderboard_snapshots;
  UPDATE profiles SET daq_balance = 100000.00;

  INSERT INTO portfolio_snapshots (
    user_id, total_value, daq_balance, holdings_value, recorded_at
  )
  SELECT user_id, 100000.00, 100000.00, 0, v_reset_at FROM profiles;

  INSERT INTO leaderboard_snapshots (
    user_id, username, total_value, rank, recorded_at
  )
  SELECT user_id, username, 100000.00, 1, v_reset_at FROM profiles;

  IF EXISTS (SELECT 1 FROM profiles WHERE daq_balance <> 100000.00) THEN
    RAISE EXCEPTION 'Player cash reset invariant failed';
  END IF;
  IF EXISTS (SELECT 1 FROM holdings) THEN
    RAISE EXCEPTION 'Holdings reset invariant failed';
  END IF;
  IF EXISTS (SELECT 1 FROM trades) THEN
    RAISE EXCEPTION 'Trade reset invariant failed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM user_achievements
    WHERE achievement_id IN (SELECT id FROM reset_achievement_ids)
      AND (is_unlocked = true OR progress <> 0 OR unlocked_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Market-dependent achievement reset invariant failed';
  END IF;

  SELECT COUNT(*) INTO v_reset_unlocked_after
  FROM user_achievements
  WHERE is_unlocked = true
    AND achievement_id IN (SELECT id FROM reset_achievement_ids);
  SELECT COUNT(*) INTO v_preserved_unlocked_after
  FROM user_achievements
  WHERE is_unlocked = true
    AND achievement_id NOT IN (SELECT id FROM reset_achievement_ids);
  IF v_reset_unlocked_after <> 0 THEN
    RAISE EXCEPTION 'Reset achievements remain unlocked';
  END IF;
  IF v_preserved_unlocked_before <> v_preserved_unlocked_after THEN
    RAISE EXCEPTION 'Unrelated achievement preservation invariant failed';
  END IF;

  UPDATE player_reset_runs
  SET status = 'applied', holdings_removed = v_holdings_removed,
      trades_removed = v_trades_removed,
      notifications_removed = v_notifications_removed,
      achievements_reset = v_achievements_reset,
      reset_achievements_unlocked_before = v_reset_unlocked_before,
      reset_achievements_unlocked_after = v_reset_unlocked_after,
      preserved_achievements_unlocked_before = v_preserved_unlocked_before,
      preserved_achievements_unlocked_after = v_preserved_unlocked_after,
      applied_at = v_reset_at
  WHERE id = v_player_run_id;

  RETURN jsonb_build_object(
    'market_rebalance_run_id', v_market_run_id,
    'player_reset_run_id', v_player_run_id
  );
END;
$$;
REVOKE ALL ON FUNCTION apply_market_and_player_reset(JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_market_and_player_reset(JSONB, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION resume_market_after_reset(p_confirmation TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID;
BEGIN
  IF p_confirmation <> 'RESUME_MARKET_AFTER_VALIDATION' THEN
    RAISE EXCEPTION 'Invalid resume confirmation';
  END IF;
  SELECT id INTO v_run_id FROM market_rebalance_runs
  WHERE status = 'applied' ORDER BY applied_at DESC LIMIT 1;
  IF v_run_id IS NULL THEN RAISE EXCEPTION 'No applied reset found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM player_reset_runs WHERE status = 'applied') THEN
    RAISE EXCEPTION 'Player reset has not completed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM market_rebalance_portfolio_audit
    WHERE run_id = v_run_id AND (discrepancy <> 0 OR rank_before <> rank_after)
  ) THEN
    RAISE EXCEPTION 'Portfolio validation has discrepancies';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE daq_balance <> 100000.00)
     OR EXISTS (SELECT 1 FROM holdings)
     OR EXISTS (SELECT 1 FROM trades) THEN
    RAISE EXCEPTION 'Player reset validation has discrepancies';
  END IF;

  UPDATE assets a
  SET trading_paused = r.old_trading_paused
  FROM market_rebalance_assets r
  WHERE r.run_id = v_run_id AND r.asset_id = a.id;

  UPDATE market_engine_controls
  SET paused = false, pause_reason = NULL, resumed_at = NOW(), updated_at = NOW()
  WHERE id = 'production';
END;
$$;
REVOKE ALL ON FUNCTION resume_market_after_reset(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resume_market_after_reset(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION get_asset_prices_24h_anchor(p_as_of TIMESTAMPTZ)
RETURNS TABLE(asset_id UUID, anchor_price NUMERIC)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (ap.asset_id) ap.asset_id, ap.price
  FROM asset_prices ap
  WHERE ap.recorded_at <= p_as_of - INTERVAL '24 hours'
  ORDER BY ap.asset_id, ap.recorded_at DESC;
$$;
GRANT EXECUTE ON FUNCTION get_asset_prices_24h_anchor(TIMESTAMPTZ) TO service_role;
