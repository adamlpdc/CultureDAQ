import { HoldingsList } from "@/components/portfolio/holdings-list";
import { PortfolioSummaryCard } from "@/components/portfolio/portfolio-summary";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCurrentUser,
  getPortfolioSummary,
  getUserHoldings,
  getUserTrades,
} from "@/lib/queries";
import { formatDaq } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/portfolio");

  const [summary, holdings, trades] = await Promise.all([
    getPortfolioSummary(user.id),
    getUserHoldings(user.id),
    getUserTrades(user.id, 20),
  ]);

  if (!summary) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Portfolio</h1>
        <p className="mt-1 text-muted">Track your holdings and performance</p>
      </div>

      <PortfolioSummaryCard summary={summary} />

      <section>
        <h2 className="mb-4 text-xl font-bold">Holdings</h2>
        <HoldingsList holdings={holdings} />
      </section>

      {trades.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <div className="divide-y divide-border">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{trade.asset.name}</p>
                    <p className="text-sm text-muted">
                      {trade.trade_type === "buy" ? "Bought" : "Sold"}{" "}
                      {trade.shares} shares @ {formatDaq(trade.price_per_share)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        trade.trade_type === "buy" ? "text-loss" : "text-gain"
                      }
                    >
                      {trade.trade_type === "buy" ? "-" : "+"}
                      {formatDaq(trade.total_daq)}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
