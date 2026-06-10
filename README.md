# CultureDAQ

A fantasy cultural stock market game where users trade shares in people, brands, entertainment properties, and sports teams using fictional **DAQ** currency.

**This is a game only.** DAQ has no real-world monetary value. Users cannot deposit, withdraw, or cash out real money.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (Auth, Postgres, Row Level Security)
- **Vercel** deployment with Cron Jobs (15-minute price updates)

## Features

- Sign up / sign in / sign out with 100,000 DAQ starting balance
- Market browse with category filters, search, and sorting
- Buy & sell shares with transaction-safe database functions
- Portfolio tracking and leaderboards
- Automated price engine with "Why It Moved" explanations
- Admin panel for featured assets, trading pauses, and price overrides
- JSON/CSV seed system supporting 800+ assets

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
cd CultureDAQ
npm install
cp .env.example .env.local
```

### 2. Configure environment

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=generate-a-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up Supabase database

In the Supabase SQL Editor, run these files **in order**:

1. `supabase/schema.sql` — tables, functions, triggers
2. `supabase/rls.sql` — Row Level Security policies

### 4. Configure Supabase Auth

In Supabase Dashboard → Authentication → Providers:

- Enable **Email** provider
- For local dev, disable "Confirm email" under Auth → Settings (optional, speeds up testing)

### 5. Seed assets

```bash
npm run seed
```

This loads `data/seed-assets.json` (80 starter assets across all categories).

**Bulk seeding (800+ assets):**

```bash
npx tsx scripts/generate-bulk-assets.ts
npm run seed -- data/bulk-assets.json
```

**CSV format** (`data/seed-assets.csv`):

```csv
slug,name,category,description,current_price,volatility_score,featured
tom-holland,Tom Holland,actors,Spider-Man star,245.50,1.2,true
```

If both CSV and JSON exist, CSV takes priority. Pass a custom file:

```bash
npm run seed -- path/to/your-assets.json
```

### 6. Create an admin user

After signing up, promote your account in the Supabase SQL Editor:

```sql
UPDATE profiles SET is_admin = true WHERE username = 'your_username';
```

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 8. Test price updates locally

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/update-prices
```

## Supabase Setup (Detailed)

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts with DAQ balance |
| `assets` | Tradeable cultural assets |
| `asset_prices` | Price history |
| `holdings` | User share ownership |
| `trades` | Trade history |
| `price_events` | "Why it moved" explanations |
| `portfolio_snapshots` | Portfolio value over time |
| `leaderboard_snapshots` | Rankings over time |

### Key Database Functions

- `buy_shares(user_id, asset_id, shares)` — atomic buy with balance/holding updates
- `sell_shares(user_id, asset_id, shares)` — atomic sell with validation
- `handle_new_user()` — auto-creates profile with 100,000 DAQ on signup
- `decay_trade_volumes()` — reduces 24h volume counters

### RLS Summary

- **Public read**: assets, asset_prices, price_events, leaderboard_snapshots, profiles (usernames)
- **User read**: own holdings, trades, portfolio_snapshots
- **Admin write**: assets, price_events, asset_prices
- **Trading**: via SECURITY DEFINER functions (bypasses RLS safely)

## Vercel Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial CultureDAQ MVP"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain)

### 3. Cron Jobs

`vercel.json` configures a cron job at `*/15 * * * *` (every 15 minutes) hitting `/api/cron/update-prices`.

Vercel automatically sends the `CRON_SECRET` as a Bearer token. Make sure `CRON_SECRET` is set in your Vercel environment variables.

### 4. Seed production database

```bash
# Set env vars locally pointing to production Supabase
npm run seed
```

### 5. Deploy

Vercel auto-deploys on push. Verify the cron endpoint after first deploy.

## Project Structure

```
src/
├── actions/          # Server actions (auth, trading, admin)
├── app/              # Next.js pages and API routes
│   ├── api/cron/     # Price update cron endpoint
│   ├── asset/[slug]/ # Asset detail + trading
│   ├── market/       # Market browse
│   ├── portfolio/    # User portfolio
│   ├── leaderboard/  # Rankings
│   └── admin/        # Admin panel
├── components/       # UI components
├── lib/              # Utilities, queries, price engine
└── types/            # TypeScript types
data/
├── seed-assets.json  # Starter seed data
supabase/
├── schema.sql        # Database schema
└── rls.sql           # RLS policies
scripts/
├── seed.ts           # Seed runner (JSON/CSV)
└── generate-bulk-assets.ts
```

## Price Engine

Prices update every 15 minutes based on:

- Buy/sell pressure from recent trades
- Momentum score (carries previous direction)
- Category weighting and trends
- Controlled random market movement
- Volatility per asset

Every meaningful movement creates a `price_events` record explaining why. The engine is designed to be swappable with real popularity signals (news, social, search trends, etc.) later.

## Trading Rules

- Cannot buy more shares than DAQ balance allows
- Cannot sell more shares than owned
- All trades are atomic via Postgres functions
- Trading can be paused per-asset by admins

## License

MIT — for fun only. Not a financial product.
