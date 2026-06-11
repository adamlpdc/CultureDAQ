import type { HoldingWithAsset } from "@/types/database";

/** Sum of shares × current price for all holdings. */
export function computeHoldingsValue(
  holdings: Array<{ shares: number; asset: { current_price: number } }>
): number {
  return holdings.reduce((sum, holding) => {
    const shares = Number(holding.shares) || 0;
    const price = Number(holding.asset?.current_price) || 0;
    return sum + shares * price;
  }, 0);
}

/** Total portfolio value = cash balance + holdings value. */
export function computeTotalPortfolioValue(
  cashBalance: number,
  holdingsValue: number
): number {
  return Number(cashBalance) + Number(holdingsValue);
}

export function computePortfolioValueFromHoldings(
  cashBalance: number,
  holdings: HoldingWithAsset[]
): number {
  return computeTotalPortfolioValue(
    cashBalance,
    computeHoldingsValue(holdings)
  );
}

/** % change between two total portfolio values. */
export function computePortfolioChangePercent(
  currentTotal: number,
  previousTotal: number | null | undefined
): number | null {
  if (previousTotal == null || previousTotal <= 0) return null;
  return ((currentTotal - previousTotal) / previousTotal) * 100;
}

/** Standard wealth display used in header, dropdown, and nav. */
export interface UserWalletSummary {
  portfolioValue: number;
  cashBalance: number;
  holdingsValue: number;
}
