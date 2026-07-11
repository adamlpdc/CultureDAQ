import assert from "node:assert/strict";
import test from "node:test";
import { shouldResetAchievement } from "./player-reset";

test("trading, holdings, portfolio, discovery, and ranking achievements reset", () => {
  for (const requirement of [
    "trade_count",
    "buy_count",
    "profitable_holding",
    "unique_assets",
    "unique_categories",
    "portfolio_value",
    "discovery_rank",
    "leaderboard_rank",
    "category_holdings",
    "profitable_holdings",
    "all_holdings_profitable",
    "hold_days",
    "contrarian",
    "perfect_timing",
  ]) {
    assert.equal(shouldResetAchievement(requirement), true, requirement);
  }
});

test("identity-only achievements remain preserved", () => {
  assert.equal(shouldResetAchievement("early_adopter"), false);
  assert.equal(shouldResetAchievement("profile_complete"), false);
});
