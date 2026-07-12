# Culture Intelligence Engine

## v2 AI Event Discovery

AI discovery is an isolated suggestion pipeline: approved RSS/Atom sources → quality filtering and story grouping → structured AI prediction → `culture_event_suggestions` → admin review. It cannot verify a CultureEvent, update an asset, or write a price. Approval calls a database function that atomically creates an **unverified draft** CultureEvent; the existing v1 confirmation step remains mandatory before Market Engine v2 can consume it.

Apply `supabase/culture-intelligence-v2.sql`, add approved HTTPS feeds to `culture_discovery_sources`, set `OPENAI_API_KEY`, and then enable `FEATURE_CULTURE_INTELLIGENCE_V2=true`. The Vercel cron calls `/api/cron/discover-culture-events` every 15 minutes using `CRON_SECRET`; `AI_DISCOVERY_INTERVAL_MINUTES` controls idempotent tick grouping and `AI_DISCOVERY_MIN_CONFIDENCE` controls the quality floor.

Suggestions retain the complete AI prediction, administrator edits, review action, source links and reasoning. Database triggers later attach actual attention, surprise delta and applied Market Engine v2 impact for calibration. Every AI and admin action is recorded in `culture_suggestion_audit_log`.

The admin queue supports editing, approval, rejection and merging. Approval is deliberately not verification. AI source access is allow-list only: the discovery service fetches only enabled URLs stored by an administrator in `culture_discovery_sources`; it does not perform open web search.

This directory is a standalone sandbox foundation for turning cultural signals into stable `CultureEvent` objects. It has no dependency on `src/lib/price-engine.ts`, the price-update cron route, trades, holdings, or production price tables.

## Architecture

1. `types.ts` defines the storage-independent `CultureEvent` contract.
2. `mock-events.ts` generates deterministic-shaped sample events for local development.
3. `service.ts` exposes a repository boundary. The admin UI asks the service for events and does not know whether they came from mocks or Supabase.
4. `supabase/culture-events.sql` creates a sandbox-only table with RLS enabled and browser access revoked.
5. `/admin/culture-events` renders the service output for authenticated admins.

The future Expectation Engine should accept `CultureEvent` objects from the service layer. It should not query `culture_events` directly, which keeps expectation modelling independent from ingestion and persistence.

## Expectation calculation

Each affected asset receives an initial contribution from every CultureEvent:

```text
signal = predicted attention × 55%
       + confidence × 100 × 30%
       + logarithmic reach score × 100 × 15%

initial contribution = signal × 0.28
```

Reach is logarithmically normalised against 100 million so a single very large event cannot overwhelm the other inputs. Contributions then decay continuously:

```text
current contribution = initial contribution × 0.5 ^ (age hours / half-life hours)
expectation score = clamp(sum of current contributions, 0, configured maximum)
```

Defaults are a 72-hour half-life and maximum score of 95. Configure them without changing code:

```env
EXPECTATION_MAX_SCORE=95
EXPECTATION_HALF_LIFE_HOURS=72
```

The admin trend compares the current score with the calculated score 24 hours earlier. A newly-created event can therefore produce a rising trend; older event portfolios naturally fall as their contributions decay.

`expectation.ts` is pure and storage-independent. `expectation-persistence.ts` is the opt-in Supabase adapter that records current scores and history snapshots. Run the decay helper only after both sandbox migrations have been applied:

```bash
npm run decay:culture-expectations
```

The helper refuses to run unless the feature flag is enabled and the event source is Supabase.

## Attention resolution

The Attention Engine resolves an event once observed attention is available on a 1–5 scale. Existing `expected_attention` is a 0–100 Culture Intelligence signal, so the resolver converts it before comparison:

```text
expected (1–5) = clamp(expected_attention / 20, 1, 5)
surprise delta = actual attention - expected (1–5)
```

Positive surprise raises the viral multiplier; disappointment lowers it. Reach is logarithmic and confidence has a smaller supporting weight. The viral multiplier is bounded between 0.5× and 3×.

Momentum is a 0–100 composite:

```text
actual attention       45%
surprise position      25%
viral multiplier       20%
confidence             10%
```

`attention.ts` is a pure resolver suitable for tests and future Price Engine v2 consumption. `attention-persistence.ts` is an explicit, feature-gated adapter that writes resolution fields only to `culture_events`. It cannot update asset prices or production price history.

Apply `supabase/culture-attention.sql` after `supabase/culture-events.sql`. It adds:

- `actual_attention`
- `surprise_delta`
- `momentum_score`
- `viral_multiplier`
- `resolved_at`

The database constraint requires resolution outputs to be either entirely pending or entirely complete.

## Price Engine v2 sandbox

`price-v2.ts` consumes the complete Expectation and Attention output contract:

- expectation score
- expected attention
- actual attention
- surprise delta
- momentum score
- viral multiplier

It calculates four transparent impact lanes—surprise, momentum, expectation gap, and viral amplification—then clamps the combined percentage change to `PRICE_V2_MAX_CHANGE_PERCENT` (12% by default). The returned `MarketSimulation` contains the read-only live-price baseline, simulated price, difference, percentage change, primary reason, triggering event, lane breakdown, and timestamp.

The calculator is pure: it cannot update live assets. `price-v2-persistence.ts` can insert the result only into `market_simulations`, whose migration has no triggers into production tables. The admin-only simulation API is:

```text
POST /api/admin/culture-events/simulate
{ "eventId": "…", "assetSlug": "…", "replayAt": "optional ISO timestamp" }
```

Historical replay defaults to the CultureEvent resolution timestamp, recalculates expectation at that point, reads the current live price only as a comparison baseline, and reruns the same deterministic v2 formula. The API also accepts an explicit `replayAt`. Mock mode returns the replay without persistence; Supabase mode stores it in the sandbox table.

The Price v2 admin tab shows current live price beside simulated output. It never presents the simulation as a committed market price.

## Why It Moved v2

`why-it-moved-v2.ts` generates an explanation for every `MarketSimulation` during the same pure calculation call. It consumes the triggering CultureEvent identity, expectation score, expected and actual attention, surprise delta, momentum, viral multiplier, impact lanes, and final simulated change.

Each simulation carries three explanation forms:

- `shortExplanation`: one sentence suitable for comparison tables.
- `detailedExplanation`: a full narrative including every input and the old-to-simulated price calculation.
- `explanationTrace`: structured signal/value/interpretation entries for auditability and future Price Engine v2 consumers.

The admin comparison view shows the short explanation by default and an expandable full breakdown with the trace. `market-simulations-explanations.sql` adds all three outputs to the sandbox table and backfills any earlier sandbox rows from their existing reason.

This service has no dependency on notifications and does not publish user-facing market messages.

## Replay & Balancing Lab

`replay-lab.ts` runs resolved historical CultureEvents through the complete pure pipeline:

```text
CultureEvent → historical Expectation → Attention resolution → Price v2 → Why It Moved
```

The lab accepts a `ReplayBalanceConfig`, so analysts can change surprise, momentum, expectation decay, viral amplification, and maximum movement without editing code. Expectation decay adjusts the effective half-life; the other multipliers modify transparent Price v2 impact lanes. All inputs are validated and bounded.

`/admin/replay-lab` provides batch execution, live-vs-simulated comparison, total divergence, winners and losers, engine statistics, saved-run comparison, and client-side CSV export. The admin-only `/api/admin/replay-lab` endpoint runs batches. Supabase mode saves immutable snapshots in `replay_lab_runs`; mock mode retains runs only in the browser session.

The lab reads live asset prices solely as baselines. It does not import or invoke the production price engine and cannot update live prices.

## Feature flag and data source

The feature is disabled by default. Enable it locally or in an explicitly selected Vercel environment:

```env
FEATURE_CULTURE_INTELLIGENCE=true
CULTURE_EVENTS_SOURCE=mock
```

`CULTURE_EVENTS_SOURCE=mock` is the safe default and does not require a database migration. Set it to `supabase` only after applying `supabase/culture-events.sql`. Never enable this flag in production until the sandbox has been approved.

## Database and sample data

Apply both migrations manually in the Supabase SQL editor, then seed the sandbox table:

1. `supabase/culture-events.sql`
2. `supabase/culture-expectations.sql`
3. `supabase/culture-attention.sql`
4. `supabase/market-simulations.sql`
5. `supabase/market-simulations-explanations.sql`
6. `supabase/replay-lab-runs.sql`

```bash
npm run seed:culture-events
```

The seed command uses the service-role key and writes to the shared Supabase project. Do not run it merely to view the UI; mock mode already supplies sample data.

## Isolation rules

- Do not import the production price engine into this directory.
- Do not write to `assets.current_price`, `asset_prices`, `price_events`, trades, or holdings.
- Keep ingestion and modelling behind the `CultureEventRepository`/`CultureEventService` boundary.
- Keep browser access to `culture_events` disabled; admin reads belong on the server.
