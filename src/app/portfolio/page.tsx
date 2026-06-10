import { HoldingsList } from "@/components/portfolio/holdings-list";
import { PortfolioSummaryCard } from "@/components/portfolio/portfolio-summary";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCurrentUser,
  getPortfolioHistory,
  getPortfolioSummary,
  getUserHoldings,
  getUserTrades,
} from "@/lib/queries";
import { formatDaq } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/portfolio");

  const [summary, holdings, trades, history] = await Promise.all([
    getPortfolioSummary(user.id),
    getUserHoldings(user.id),
    getUserTrades(user.id, 20),
    getPortfolioHistory(user.id),
  ]);

  if (!summary) redirect("/login");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portfolio"
        description="Track your holdings, performance, and recent activity."
      />

      <PortfolioSummaryCard summary={summary} history={history} />

      <section>
        <SectionHeader title="Holdings" />
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
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{trade.asset.name}</p>
                    <p className="text-sm text-muted">
                      {trade.trade_type === "buy" ? "Bought" : "Sold"}{" "}
                      {trade.shares} shares @ {formatDaq(trade.price_per_share)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={
                        trade.trade_type === "buy"
                          ? "font-semibold text-loss"
                          : "font-semibold text-gain"
                      }
                    >
                      {trade.trade_type === "buy" ? "-" : "+"}
                      {formatDaq(trade.total_daq)}
                    </p>
                    <p className="text-xs text-muted-light">
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
