#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — copy .env.example first."
  exit 1
fi

# shellcheck disable=SC1091
source .env.local 2>/dev/null || true

missing=0
for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing: $var"
    missing=1
  fi
done

if [[ $missing -eq 1 ]]; then
  echo ""
  echo "Add your Supabase keys to .env.local, then re-run: bash scripts/setup-local.sh"
  exit 1
fi

echo "Seeding assets..."
npm run seed

echo ""
echo "Setup complete. Start the app with: npm run dev"
