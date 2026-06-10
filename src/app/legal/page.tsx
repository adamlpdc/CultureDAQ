import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Legal Notice"
        description="Important legal information about CultureDAQ."
      />

      <Card className="space-y-4 text-sm text-foreground-secondary">
        <section>
          <h2 className="text-base font-semibold text-foreground">Entertainment only</h2>
          <p>
            CultureDAQ is a game simulating a cultural stock market. It is designed for
            entertainment and competition among players using fictional virtual currency.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">No real money</h2>
          <p>
            DAQ cannot be exchanged for real currency. CultureDAQ does not facilitate real-money
            deposits, withdrawals, or payouts of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Not gambling</h2>
          <p>
            CultureDAQ is not a gambling platform. Outcomes are based on in-game market mechanics
            and player decisions within a closed virtual economy.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Asset references</h2>
          <p>
            Tradeable assets reference public figures, brands, and properties for gameplay
            purposes. CultureDAQ is not affiliated with or endorsed by any referenced entity
            unless explicitly stated.
          </p>
        </section>
      </Card>
    </div>
  );
}
