-- CultureDAQ Asset Rank History
-- Run after schema.sql

CREATE TABLE IF NOT EXISTS asset_rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank > 0),
  previous_rank INTEGER CHECK (previous_rank IS NULL OR previous_rank > 0),
  rank_change INTEGER,
  portfolio_value_basis NUMERIC(18, 4) NOT NULL,
  price NUMERIC(18, 4) NOT NULL CHECK (price > 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_rank_history_asset_id ON asset_rank_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_rank_history_recorded_at ON asset_rank_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_rank_history_rank ON asset_rank_history(rank);
CREATE INDEX IF NOT EXISTS idx_asset_rank_history_asset_recorded
  ON asset_rank_history(asset_id, recorded_at DESC);

ALTER TABLE asset_rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Asset rank history is viewable by everyone"
  ON asset_rank_history FOR SELECT
  USING (true);
