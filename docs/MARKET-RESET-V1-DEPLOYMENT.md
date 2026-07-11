# Market Reset v1.0 — Deployment Gate

Branch: `feature-market-reset-v1`

## Implemented

- Approved 1,000–50,000 DAQ rank-preserving curve
- Stock-split preservation audit before player reset
- Corporate-action chart adjustments
- One-time player audit and reset
- 100,000 DAQ cash baseline
- Holdings and completed trade removal
- Old portfolio/leaderboard snapshot removal and clean baseline creation
- Market-dependent achievement reset with identity-achievement preservation
- Price-dependent notification cleanup
- Market/trading pause and confirmation-gated resume
- Zero-bias production engine, tick/daily caps, materiality, and drift warning
- Backup, preview, apply, validate, and resume commands

## Live-data dry run (11 July 2026)

- Assets checked: 84
- Player profiles checked: 4
- Asset rank changes: 0
- Pre-reset portfolio rank changes: 0
- Maximum pre-reset portfolio discrepancy: 0 DAQ
- Maximum return-ratio floating drift: `4.656612873077393e-10`
- Critical issues: 0

The four audited player baselines were:

| Rank | Player | Previous portfolio value | Preserved market-phase value |
|---:|---|---:|---:|
| 1 | actionrag | 65,156,303,109.46 | 65,156,303,109.46 |
| 2 | wondercrumpet | 17,451,077,053.24 | 17,451,077,053.24 |
| 3 | penguindaddy | 15,636,946,440.00 | 15,636,946,440.00 |
| 4 | studdles | 100,000.00 | 100,000.00 |

After the combined reset, every profile must validate at exactly 100,000 DAQ cash, zero holdings, and zero old trades. The actual post-migration report is produced by `npm run rebalance:validate` while the engine remains paused.

## Blocking deployment prerequisites

1. Preview/staging and production currently share one Supabase project. A separate staging database is required for the requested staging-first run.
2. `DATABASE_URL` is absent from `.env.local`.
3. `pg_dump` is not installed on this machine.
4. No full backup artifact therefore exists yet.

Do not apply or deploy until all four conditions are resolved.

## Maintenance sequence

```text
1. Provision isolated staging Supabase and configure DATABASE_URL.
2. Install pg_dump.
3. Apply supabase/market-rebalance-once.sql to staging.
4. Run npm run rebalance:backup.
5. Pause Vercel cron/deployment traffic externally.
6. Run preview and dry-run validation.
7. Apply with the exact combined-reset confirmation and backup path.
8. Run npm run rebalance:validate.
9. Require zero critical issues.
10. Resume using the exact resume confirmation.
11. Repeat the reviewed sequence in the production maintenance window.
```

No production deployment or database reset has been performed.
