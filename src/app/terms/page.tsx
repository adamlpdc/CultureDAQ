import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Terms of Use"
        description="CultureDAQ platform terms and conditions."
      />

      <Card className="prose prose-slate max-w-none space-y-4 text-sm text-foreground-secondary">
        <section>
          <h2 className="text-base font-semibold text-foreground">About CultureDAQ</h2>
          <p>
            CultureDAQ is a fantasy cultural trading game. Users trade shares in people,
            brands, entertainment properties, and sports teams using fictional DAQ currency.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Virtual currency</h2>
          <p>
            DAQ has no real-world monetary value. Users cannot deposit money, withdraw money,
            cash out, purchase DAQ with real currency, or win real money through CultureDAQ.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Not a financial product</h2>
          <p>
            CultureDAQ is not real-money trading, investing, gambling, or a financial product.
            All activity is for entertainment purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Accounts</h2>
          <p>
            New accounts receive a starting DAQ balance for gameplay. You are responsible for
            maintaining the security of your account credentials.
          </p>
        </section>
      </Card>
    </div>
  );
}
