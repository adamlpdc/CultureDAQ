# One-time Market Rebalance

This workflow implements Market Reset v1.0 as a stock-split-style redenomination and removes the production engine's unconditional positive expectancy.

## Why shares must also change

A nonlinear price transform preserves asset ordering but would normally change the composition and ranking of player portfolios. The migration prevents that by applying the inverse factor to held shares:

```text
price factor = new price / old price
new shares = old shares / price factor
new average cost = old average cost × price factor
new total shares outstanding = old total shares outstanding / price factor
```

Therefore current holding value and cost basis are preserved:

```text
new shares × new price = old shares × old price
new shares × new average cost = old shares × old average cost
```

Cash balances do not change. Portfolio allocations, total portfolio values, and leaderboard rankings consequently remain unchanged apart from bounded numeric rounding.

## Target mapping

Assets are ordered by current price and mapped monotonically using continuous geometric interpolation:

- Bottom 50%: 1K–5K DAQ
- Next 15%: 5K–10K DAQ
- Next 20%: 10K–25K DAQ
- Top 15%: 25K–50K DAQ

`previous_price` is scaled by the same factor, preserving the displayed percentage movement at the rebalance boundary.

## Safe workflow

1. Keep `FEATURE_MARKET_REBALANCE=false` normally.
2. Provision a separate staging Supabase database. Preview/production currently share one project, so the reset must not be tested against the shared project.
3. Apply `supabase/market-rebalance-once.sql` to staging. This installs controls and transactional functions without applying the reset.
4. Set `FEATURE_MARKET_REBALANCE=true` against staging and run `npm run rebalance:preview`.
5. Review `/admin/market-rebalance`, asset counts, rank preservation, value drift, and tier distribution.
6. Set `DATABASE_URL` and create a full backup with `npm run rebalance:backup`.
7. Pause the deployment/cron externally for the maintenance window.
8. Apply using the verified backup path:

```bash
npm run rebalance:apply -- --confirm=MARKET_AND_PLAYER_RESET_V1 --backup=/absolute/path/to/backup.dump
```

9. The transactional function leaves all trading and the market engine paused.
10. Run `npm run rebalance:validate` and retain its top-20/top-100 report.
11. Resume only after zero critical issues using `npm run rebalance:resume -- --confirm=RESUME_MARKET_AFTER_VALIDATION`.
12. Return `FEATURE_MARKET_REBALANCE=false`.

The database function is atomic, validates live prices against the preview, requires every asset, requires unchanged ranks, verifies the top 100 portfolios inside the transaction, verifies unlocked-achievement counts, and refuses a second application.

## One-time player reset

The same transaction resets all existing players after auditing their prior cash, holdings value, total portfolio value, holding count, trade count, and affected achievements.

- Cash becomes exactly 100,000 DAQ.
- Holdings and completed trade history are removed.
- Total shares outstanding return to zero.
- Portfolio and leaderboard snapshots are replaced by a 100,000 DAQ baseline.
- Price-, rank-, portfolio-, and trade-dependent notifications are removed.
- Watchlist membership and notification preferences remain.
- Authentication identities, verification state, usernames, display names, avatars, and unrelated cosmetic settings remain.
- Market-dependent achievement progress is reset; identity-only achievements such as Early Adopter remain.
- Favorite achievement display is cleared only when it points at a reset achievement.

There are currently no open-order, pending-order, or stored watchlist-price-threshold tables in the application schema.

## Engine corrections

- Volume amplifies signed movement only and cannot create a return by itself.
- No signed signal produces exactly zero return.
- Random movement remains centred around zero.
- Momentum is signed and decays 40% toward zero each tick before new impulse.
- Normal per-tick movement is capped at ±0.35%.
- Normal rolling 24-hour movement is capped at ±5%.
- Only an explicitly verified CultureEvent input can use the larger ±15% event cap.
- Movements below 0.02% are skipped.
- Median 24-hour market drift above ±0.15% is emitted as a warning.

## Intentionally unchanged

- Cron schedule
- DAQ cash balances
- Historical trades
- Historical prices and price events
- Existing portfolio and leaderboard history

The migration adds a new post-rebalance snapshot rather than rewriting history. Historical charts apply recorded corporate-action price factors to older observations.
