-- CultureDAQ Achievements Balance Pass
-- Run after achievements.sql / achievements-seed.sql / achievements-v2.sql

INSERT INTO achievements (code, name, description, category, points, icon, requirement_type, requirement_value, is_hidden, rarity, scope)
VALUES (
  'CULTURE_TITAN',
  'Culture Titan',
  'Build a cultural empire worth 10 million DAQ.',
  'Portfolio',
  1000,
  '👑',
  'portfolio_value',
  '{"value": 10000000}',
  false,
  'Legendary',
  'standard'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  points = EXCLUDED.points,
  requirement_value = EXCLUDED.requirement_value,
  rarity = EXCLUDED.rarity;

UPDATE achievements SET
  description = 'Build a seven-figure cultural portfolio.',
  points = 250,
  requirement_value = '{"value": 1000000}',
  rarity = 'Epic'
WHERE code = 'BIG_PORTFOLIO';

UPDATE achievements SET
  description = 'Join the elite ranks of CultureDAQ''s wealthiest traders.',
  points = 500,
  requirement_value = '{"value": 5000000}',
  rarity = 'Legendary'
WHERE code = 'MARKET_MOGUL';

UPDATE achievements SET
  description = 'Predict a cultural breakout before the market notices.',
  points = 500,
  rarity = 'Epic'
WHERE code = 'CULTURAL_ORACLE';

UPDATE achievements SET
  description = 'Back a future market leader before anyone else.',
  points = 1000,
  rarity = 'Legendary'
WHERE code = 'KINGMAKER';

UPDATE achievements SET
  description = 'Become the highest ranked trader in CultureDAQ.',
  points = 1500,
  rarity = 'Legendary'
WHERE code = 'NUMBER_ONE';
