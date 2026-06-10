# Adding New Achievements

CultureDAQ achievements are database-driven. To add a new achievement:

## 1. Insert a row in `achievements`

Run in Supabase SQL Editor (or add to `supabase/achievements-seed.sql`):

```sql
INSERT INTO achievements (code, name, description, category, points, icon, requirement_type, requirement_value, is_hidden)
VALUES (
  'YOUR_CODE',
  'Display Name',
  'What the player must do',
  'Trading',           -- category enum
  100,                 -- points
  '🏆',                -- icon emoji
  'trade_count',       -- requirement_type (see unlock.ts)
  '{"count": 25}',     -- requirement_value JSON
  false                -- is_hidden
);
```

## 2. Supported `requirement_type` values

| Type | `requirement_value` | Unlock condition |
|------|-------------------|------------------|
| `trade_count` | `{"count": N}` | Total trades ≥ N |
| `buy_count` | `{"count": N}` | Buy trades ≥ N |
| `profitable_holding` | `{"count": N}` | Holdings in profit ≥ N |
| `unique_assets` | `{"count": N}` | Distinct held assets ≥ N |
| `unique_categories` | `{"count": N}` | Distinct categories ≥ N |
| `portfolio_value` | `{"value": N}` | Portfolio value ≥ N DAQ |
| `leaderboard_rank` | `{"rank": N}` | Rank ≤ N |
| `category_holdings` | `{"category": "movies", "count": 5}` | Assets in category ≥ N |
| `profitable_holdings` | `{"count": N}` | Simultaneous profitable holdings ≥ N |
| `all_holdings_profitable` | `{}` | Every holding profitable |
| `early_adopter` | `{}` | Joined before cutoff in `constants.ts` |
| `discovery_rank` | `{"rank": N}` | Bought asset when rank > N, now rank ≤ N |
| `hold_days` | `{"days": N}` | Held same asset ≥ N days |
| `contrarian` | `{}` | Bought while asset down, now profitable |
| `perfect_timing` | `{}` | Bought rank > 10 within 24h of entering top 10 |

For a **new requirement type**, add a case in `src/lib/achievements/unlock.ts` → `evaluateAchievement()`.

## 3. Unlock flow

`checkAndUnlockAchievements(userId)` in `src/lib/achievements/unlock.ts`:

- Loads user context (profile, holdings, trades, rank)
- Evaluates every achievement
- Upserts `user_achievements` with progress / unlock
- Returns newly unlocked for toast display

Called automatically after buy/sell trades and on app load via `syncAchievements()`.

## 4. UI

The `/achievements` page reads all rows from `achievements` and merges with `user_achievements`. No frontend code changes needed for standard types.

## 5. Files

- Schema: `supabase/achievements.sql`
- Seed: `supabase/achievements-seed.sql`
- RLS: `supabase/achievements-rls.sql`
- Logic: `src/lib/achievements/unlock.ts`
- Page: `src/app/achievements/page.tsx`
