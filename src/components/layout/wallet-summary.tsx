import { formatDaq } from "@/lib/utils";
import type { UserWalletSummary } from "@/lib/portfolio-value";

interface WalletSummaryDropdownProps {
  wallet: UserWalletSummary;
  className?: string;
}

export function WalletSummaryDropdown({ wallet, className }: WalletSummaryDropdownProps) {
  return (
    <div className={className}>
      <div className="px-3.5 py-3">
        <div className="space-y-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Portfolio Value
            </p>
            <p className="text-stat text-sm font-bold text-foreground">
              {formatDaq(wallet.portfolioValue)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Cash Balance
              </p>
              <p className="text-stat mt-0.5 text-xs font-bold text-gold">
                {formatDaq(wallet.cashBalance)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Holdings Value
              </p>
              <p className="text-stat mt-0.5 text-xs font-bold text-foreground">
                {formatDaq(wallet.holdingsValue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WalletSummaryCompactProps {
  wallet: UserWalletSummary;
  className?: string;
}

/** Header pill — compact portfolio value indicator only. */
export function WalletSummaryCompact({ wallet, className }: WalletSummaryCompactProps) {
  return (
    <div className={className}>
      <span className="text-sm text-muted">Portfolio </span>
      <span className="text-stat text-sm font-bold text-foreground">
        {formatDaq(wallet.portfolioValue)}
      </span>
    </div>
  );
}
