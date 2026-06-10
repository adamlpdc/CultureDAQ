import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-section">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo link={false} size="sm" />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              The cultural exchange for momentum, competition, and portfolio building.
            </p>
          </div>

          <div className="flex gap-14 sm:gap-16 text-sm">
            <div>
              <p className="mb-3.5 font-semibold text-foreground">Platform</p>
              <ul className="space-y-2.5 text-muted">
                <li><Link href="/market" className="hover:text-primary">Market</Link></li>
                <li><Link href="/portfolio" className="hover:text-primary">Portfolio</Link></li>
                <li><Link href="/leaderboard" className="hover:text-primary">Leaderboard</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3.5 font-semibold text-foreground">Legal</p>
              <ul className="space-y-2.5 text-muted">
                <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
                <li><Link href="/legal" className="hover:text-primary">Legal</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="max-w-3xl text-[13px] leading-[1.7] text-muted">
            DAQ is fictional virtual currency with no real-world value. CultureDAQ is a game —
            not real-money trading, investing, gambling, or a financial product.
          </p>
        </div>
      </div>
    </footer>
  );
}
