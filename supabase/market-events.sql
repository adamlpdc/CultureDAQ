-- CultureDAQ Market Events V1
-- Run after schema.sql and asset-rank-history.sql

CREATE TYPE market_event_type AS ENUM (
  'category_trending',
  'rank_up',
  'rank_down',
  'buying_pressure',
  'selling_pressure',
  'new_listing',
  'market_momentum',
  'cultural_moment'
);

CREATE TABLE IF NOT EXISTS market_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  event_type market_event_type NOT NULL,
  headline TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_score INTEGER NOT NULL CHECK (impact_score >= 0),
  is_positive BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_market_events_asset_id ON market_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_market_events_created_at ON market_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_events_asset_created
  ON market_events(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_events_type
  ON market_events(asset_id, event_type);
CREATE INDEX IF NOT EXISTS idx_market_events_expires_at
  ON market_events(expires_at);

ALTER TABLE market_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market events are viewable by everyone"
  ON market_events FOR SELECT
  USING (true);
