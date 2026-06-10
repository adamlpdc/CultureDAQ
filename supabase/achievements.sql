-- CultureDAQ Achievements System
-- Run after schema.sql and rls.sql

CREATE TYPE achievement_category AS ENUM (
  'Getting Started',
  'Trading',
  'Portfolio',
  'Discovery',
  'Rankings',
  'Categories',
  'Streaks',
  'Special'
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category achievement_category NOT NULL,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  icon TEXT NOT NULL DEFAULT '🏆',
  requirement_type TEXT NOT NULL,
  requirement_value JSONB NOT NULL DEFAULT '{}',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achievements_code ON achievements(code);
CREATE INDEX idx_achievements_category ON achievements(category);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ,
  progress NUMERIC(8, 4) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);

-- Rank at buy time for discovery achievements
ALTER TABLE trades ADD COLUMN IF NOT EXISTS asset_market_rank INTEGER;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS asset_was_down BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TRIGGER user_achievements_updated_at BEFORE UPDATE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
