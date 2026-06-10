-- CultureDAQ Database Schema
-- Run this in the Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE asset_category AS ENUM (
  'actors',
  'musicians',
  'athletes',
  'influencers',
  'tv_personalities',
  'brands',
  'movies',
  'tv_shows',
  'sports_teams'
);

CREATE TYPE trade_type AS ENUM ('buy', 'sell');

CREATE TYPE price_event_source AS ENUM (
  'market_engine',
  'buy_pressure',
  'sell_pressure',
  'momentum',
  'volatility',
  'category_trend',
  'random',
  'admin',
  'news',
  'social',
  'search_trends',
  'sports_results',
  'box_office',
  'tv_ratings',
  'ai_generated'
);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT,
  daq_balance NUMERIC(18, 2) NOT NULL DEFAULT 100000.00 CHECK (daq_balance >= 0),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category asset_category NOT NULL,
  description TEXT,
  image_url TEXT,
  current_price NUMERIC(18, 4) NOT NULL DEFAULT 100.0000 CHECK (current_price > 0),
  previous_price NUMERIC(18, 4) NOT NULL DEFAULT 100.0000 CHECK (previous_price > 0),
  buy_pressure NUMERIC(10, 4) NOT NULL DEFAULT 0,
  sell_pressure NUMERIC(10, 4) NOT NULL DEFAULT 0,
  momentum_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
  volatility_score NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
  category_weight NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  trading_paused BOOLEAN NOT NULL DEFAULT FALSE,
  trade_volume_24h INTEGER NOT NULL DEFAULT 0,
  total_shares_outstanding BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_slug ON assets(slug);
CREATE INDEX idx_assets_featured ON assets(featured) WHERE featured = TRUE;
CREATE INDEX idx_assets_current_price ON assets(current_price DESC);
CREATE INDEX idx_assets_trade_volume ON assets(trade_volume_24h DESC);
CREATE INDEX idx_assets_name_search ON assets USING gin(to_tsvector('english', name));

-- Asset Prices (history)
CREATE TABLE asset_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  price NUMERIC(18, 4) NOT NULL CHECK (price > 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_prices_asset_id ON asset_prices(asset_id);
CREATE INDEX idx_asset_prices_recorded_at ON asset_prices(recorded_at DESC);
CREATE INDEX idx_asset_prices_asset_recorded ON asset_prices(asset_id, recorded_at DESC);

-- Holdings
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  shares INTEGER NOT NULL DEFAULT 0 CHECK (shares >= 0),
  avg_cost NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (avg_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, asset_id)
);

CREATE INDEX idx_holdings_user_id ON holdings(user_id);
CREATE INDEX idx_holdings_asset_id ON holdings(asset_id);

-- Trades
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  trade_type trade_type NOT NULL,
  shares INTEGER NOT NULL CHECK (shares > 0),
  price_per_share NUMERIC(18, 4) NOT NULL CHECK (price_per_share > 0),
  total_daq NUMERIC(18, 2) NOT NULL CHECK (total_daq > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_asset_id ON trades(asset_id);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX idx_trades_asset_created ON trades(asset_id, created_at DESC);

-- Price Events ("Why it moved")
CREATE TABLE price_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  old_price NUMERIC(18, 4) NOT NULL CHECK (old_price > 0),
  new_price NUMERIC(18, 4) NOT NULL CHECK (new_price > 0),
  change_percent NUMERIC(10, 4) NOT NULL,
  reason TEXT NOT NULL,
  source price_event_source NOT NULL DEFAULT 'market_engine',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_events_asset_id ON price_events(asset_id);
CREATE INDEX idx_price_events_created_at ON price_events(created_at DESC);
CREATE INDEX idx_price_events_asset_created ON price_events(asset_id, created_at DESC);

-- Portfolio Snapshots
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  daq_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  holdings_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_recorded_at ON portfolio_snapshots(recorded_at DESC);

-- Leaderboard Snapshots
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  total_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_snapshots_recorded_at ON leaderboard_snapshots(recorded_at DESC);
CREATE INDEX idx_leaderboard_snapshots_rank ON leaderboard_snapshots(rank);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER holdings_updated_at BEFORE UPDATE ON holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup with 100,000 DAQ
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );
  base_username := REGEXP_REPLACE(LOWER(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN
    base_username := 'trader';
  END IF;
  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::TEXT;
  END LOOP;

  INSERT INTO profiles (user_id, username, display_name, daq_balance)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', final_username),
    100000.00
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Buy shares (transaction-safe)
CREATE OR REPLACE FUNCTION buy_shares(
  p_user_id UUID,
  p_asset_id UUID,
  p_shares INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset RECORD;
  v_profile RECORD;
  v_total_cost NUMERIC(18, 2);
  v_holding RECORD;
  v_new_avg_cost NUMERIC(18, 4);
  v_trade_id UUID;
BEGIN
  IF p_shares IS NULL OR p_shares <= 0 THEN
    RAISE EXCEPTION 'Shares must be a positive integer';
  END IF;

  SELECT * INTO v_asset FROM assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  IF v_asset.trading_paused THEN
    RAISE EXCEPTION 'Trading is paused for this asset';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_total_cost := ROUND(v_asset.current_price * p_shares, 2);

  IF v_profile.daq_balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient DAQ balance';
  END IF;

  UPDATE profiles
  SET daq_balance = daq_balance - v_total_cost
  WHERE user_id = p_user_id;

  SELECT * INTO v_holding FROM holdings
  WHERE user_id = p_user_id AND asset_id = p_asset_id FOR UPDATE;

  IF FOUND THEN
    v_new_avg_cost := (
      (v_holding.avg_cost * v_holding.shares) + (v_asset.current_price * p_shares)
    ) / (v_holding.shares + p_shares);

    UPDATE holdings
    SET shares = shares + p_shares, avg_cost = v_new_avg_cost
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO holdings (user_id, asset_id, shares, avg_cost)
    VALUES (p_user_id, p_asset_id, p_shares, v_asset.current_price);
  END IF;

  INSERT INTO trades (user_id, asset_id, trade_type, shares, price_per_share, total_daq)
  VALUES (p_user_id, p_asset_id, 'buy', p_shares, v_asset.current_price, v_total_cost)
  RETURNING id INTO v_trade_id;

  UPDATE assets SET
    buy_pressure = buy_pressure + p_shares,
    trade_volume_24h = trade_volume_24h + p_shares,
    total_shares_outstanding = total_shares_outstanding + p_shares
  WHERE id = p_asset_id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'total_cost', v_total_cost,
    'price_per_share', v_asset.current_price
  );
END;
$$;

-- Sell shares (transaction-safe)
CREATE OR REPLACE FUNCTION sell_shares(
  p_user_id UUID,
  p_asset_id UUID,
  p_shares INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset RECORD;
  v_profile RECORD;
  v_holding RECORD;
  v_total_proceeds NUMERIC(18, 2);
  v_trade_id UUID;
BEGIN
  IF p_shares IS NULL OR p_shares <= 0 THEN
    RAISE EXCEPTION 'Shares must be a positive integer';
  END IF;

  SELECT * INTO v_asset FROM assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  IF v_asset.trading_paused THEN
    RAISE EXCEPTION 'Trading is paused for this asset';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_holding FROM holdings
  WHERE user_id = p_user_id AND asset_id = p_asset_id FOR UPDATE;

  IF NOT FOUND OR v_holding.shares < p_shares THEN
    RAISE EXCEPTION 'Insufficient shares to sell';
  END IF;

  v_total_proceeds := ROUND(v_asset.current_price * p_shares, 2);

  UPDATE profiles
  SET daq_balance = daq_balance + v_total_proceeds
  WHERE user_id = p_user_id;

  IF v_holding.shares = p_shares THEN
    DELETE FROM holdings WHERE id = v_holding.id;
  ELSE
    UPDATE holdings SET shares = shares - p_shares WHERE id = v_holding.id;
  END IF;

  INSERT INTO trades (user_id, asset_id, trade_type, shares, price_per_share, total_daq)
  VALUES (p_user_id, p_asset_id, 'sell', p_shares, v_asset.current_price, v_total_proceeds)
  RETURNING id INTO v_trade_id;

  UPDATE assets SET
    sell_pressure = sell_pressure + p_shares,
    trade_volume_24h = trade_volume_24h + p_shares,
    total_shares_outstanding = GREATEST(0, total_shares_outstanding - p_shares)
  WHERE id = p_asset_id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'total_proceeds', v_total_proceeds,
    'price_per_share', v_asset.current_price
  );
END;
$$;

-- Decay trade volume periodically (called by price engine)
CREATE OR REPLACE FUNCTION decay_trade_volumes()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE assets SET trade_volume_24h = GREATEST(0, FLOOR(trade_volume_24h * 0.85));
END;
$$;

-- Portfolio value helper
CREATE OR REPLACE FUNCTION get_portfolio_value(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT SUM(h.shares * a.current_price)
     FROM holdings h
     JOIN assets a ON a.id = h.asset_id
     WHERE h.user_id = p_user_id),
    0
  );
$$;
