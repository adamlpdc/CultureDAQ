-- CultureDAQ Row Level Security Policies
-- Run after schema.sql

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE user_id = auth.uid()),
    FALSE
  );
$$;

-- Profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Assets (public read, admin write)
CREATE POLICY "Assets are viewable by everyone"
  ON assets FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert assets"
  ON assets FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update assets"
  ON assets FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete assets"
  ON assets FOR DELETE
  USING (is_admin());

-- Asset Prices (public read)
CREATE POLICY "Asset prices are viewable by everyone"
  ON asset_prices FOR SELECT
  USING (true);

CREATE POLICY "Service role inserts asset prices"
  ON asset_prices FOR INSERT
  WITH CHECK (is_admin());

-- Holdings
CREATE POLICY "Users can view own holdings"
  ON holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all holdings"
  ON holdings FOR SELECT
  USING (is_admin());

-- Trades
CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trades"
  ON trades FOR SELECT
  USING (is_admin());

-- Price Events (public read)
CREATE POLICY "Price events are viewable by everyone"
  ON price_events FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert price events"
  ON price_events FOR INSERT
  WITH CHECK (is_admin());

-- Portfolio Snapshots
CREATE POLICY "Users can view own portfolio snapshots"
  ON portfolio_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all portfolio snapshots"
  ON portfolio_snapshots FOR SELECT
  USING (is_admin());

-- Leaderboard Snapshots (public read)
CREATE POLICY "Leaderboard snapshots are viewable by everyone"
  ON leaderboard_snapshots FOR SELECT
  USING (true);

-- Grant execute on trading functions to authenticated users
GRANT EXECUTE ON FUNCTION buy_shares(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION sell_shares(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_portfolio_value(UUID) TO authenticated, anon;
