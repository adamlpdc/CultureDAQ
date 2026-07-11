-- Price Engine v2 sandbox only. Apply after supabase/culture-attention.sql.
-- This table has no triggers into assets, asset_prices, trades, or price_events.

CREATE TABLE IF NOT EXISTS market_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_slug TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  old_price NUMERIC(14,4) NOT NULL CHECK (old_price > 0),
  simulated_price NUMERIC(14,4) NOT NULL CHECK (simulated_price > 0),
  change_percent NUMERIC(8,3) NOT NULL,
  price_impact NUMERIC(14,4) NOT NULL,
  culture_event_id UUID NOT NULL REFERENCES culture_events(id) ON DELETE CASCADE,
  culture_event_title TEXT NOT NULL,
  reason TEXT NOT NULL,
  impact_lanes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(impact_lanes) = 'array'),
  simulated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE market_simulations IS
  'Sandbox-only Price Engine v2 output. Never writes to or replaces live asset prices.';

CREATE INDEX IF NOT EXISTS market_simulations_asset_time_idx
  ON market_simulations (asset_slug, simulated_at DESC);
CREATE INDEX IF NOT EXISTS market_simulations_event_idx
  ON market_simulations (culture_event_id);

ALTER TABLE market_simulations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE market_simulations FROM anon, authenticated;
