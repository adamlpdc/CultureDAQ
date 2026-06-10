-- CultureDAQ Achievements V2 – rarity & future scopes
-- Run after achievements.sql and achievements-seed.sql

DO $$ BEGIN
  CREATE TYPE achievement_rarity AS ENUM ('Common', 'Rare', 'Epic', 'Legendary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE achievement_scope AS ENUM ('standard', 'seasonal', 'event', 'league');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE achievements ADD COLUMN IF NOT EXISTS rarity achievement_rarity NOT NULL DEFAULT 'Common';
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS scope achievement_scope NOT NULL DEFAULT 'standard';
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS season_id TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS league_id TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_scope ON achievements(scope);

UPDATE achievements SET rarity = 'Common' WHERE code IN ('FIRST_TRADE', 'FIRST_BUY', 'FIRST_PROFIT');
UPDATE achievements SET rarity = 'Rare' WHERE code IN (
  'ACTIVE_TRADER', 'PORTFOLIO_BUILDER', 'DIVERSIFIED', 'TOP_100_TRADER',
  'TREND_SPOTTER', 'MOVIE_BUFF', 'MUSIC_MOGUL', 'SPORTS_FANATIC', 'BRAND_BUILDER',
  'STAR_COLLECTOR', 'EARLY_ADOPTER', 'HOT_STREAK'
);
UPDATE achievements SET rarity = 'Epic' WHERE code IN (
  'MARKET_REGULAR', 'POWER_TRADER', 'CULTURE_FUND', 'BIG_PORTFOLIO',
  'TOP_25_TRADER', 'TOP_10_TRADER', 'TALENT_SCOUT', 'CULTURAL_ORACLE',
  'GREEN_PORTFOLIO', 'DIAMOND_HANDS', 'CONTRARIAN'
);
UPDATE achievements SET rarity = 'Legendary' WHERE code IN (
  'MARKET_MOGUL', 'KINGMAKER', 'NUMBER_ONE', 'PERFECT_TIMING', 'CULTURE_TITAN'
);
