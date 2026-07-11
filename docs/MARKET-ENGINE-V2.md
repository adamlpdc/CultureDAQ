# Market Engine v2

Market Engine v2 is the default production pricing path. Set
`MARKET_ENGINE_V2_ENABLED=false` only for an emergency rollback to the retained
zero-bias legacy calculator.

## Pipeline

```text
CultureEvent -> asset expectation -> resolved attention -> signed price signal
             -> Why It Moved explanation -> price event -> notifications
```

The active engine reads resolved `culture_events`, current `asset_expectations`,
signed asset momentum and tightly capped player trading pressure. Volume never
adds direction. Deterministic symmetric noise is added only when a signed signal
already exists, so a no-signal tick produces exactly zero movement.

## Limits

- Normal tick: `+/-0.35%`
- Rolling 24 hours: `+/-5%`
- Verified CultureEvent tick: up to `+/-15%`
- Materiality: movements below `0.02%` are audited and skipped
- Player trading pressure: signed and capped at `+/-0.08%`
- Seven-day drift warning: average daily market median above `+/-0.15%`

Resolved events decay continuously using their stored `decay_rate`. Expectation
acts only as a dampener on surprise; it cannot create positive return by itself.
Momentum is signed, bounded and mean-reverts on every calculation.

## Idempotency and locking

Each 15-minute UTC bucket is a unique `tick_key` in
`market_engine_v2_runs`. Concurrent or retried cron requests receive the existing
run and exit before pricing or notifications. Every asset has one unique
calculation per run. The database RPC records the audit row and applies a price
inside one transaction with an optimistic old-price check.
Each resolved CultureEvent can be consumed only once per affected asset, enforced
by a partial unique database index, so a 15-minute retry cannot compound the same
surprise repeatedly.

## Audit trail

`market_engine_v2_calculations` records every asset, including skipped updates:

- expectation, expected attention and actual attention
- surprise delta and signed momentum
- player trading pressure and CultureEvent impact
- symmetric noise, old price, new price and final percentage move
- applied caps, complete input/output JSON and both explanations
- whether the movement was materially applied

The run ledger also stores the complete sanitized error list and marks any tick
with an error as failed, including downstream event or notification failures.

Applied changes also write `asset_prices` and a `price_events` row containing the
engine version, run ID, calculation ID, CultureEvent ID, explanation and caps.

## Database installation

Apply in this order:

1. `supabase/culture-events.sql`
2. `supabase/culture-expectations.sql`
3. `supabase/culture-attention.sql`
4. `supabase/market-rebalance-once.sql`
5. `supabase/market-engine-v2.sql`

The application deployment and database migration must be completed before the
next cron tick. Keep `market_engine_controls.production.paused = true` during the
maintenance window, run one authenticated cron request, inspect its audit run,
then resume the schedule.

## Emergency rollback

Set `MARKET_ENGINE_V2_ENABLED=false` and redeploy. The cron then uses the retained
legacy calculator, labels every resulting price event `legacy_rollback`, and
continues to respect the market pause control. The v2 audit history remains
immutable.
