"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Award,
  ChevronDown,
  Eye,
  LogOut,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { signOut } from "@/actions/auth";
import { WalletSummaryDropdown } from "@/components/layout/wallet-summary";
import type { UserWalletSummary } from "@/lib/portfolio-value";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UserAccountMenuProps {
  username: string;
  isAdmin: boolean;
  wallet: UserWalletSummary;
  className?: string;
}

const menuLinks = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/achievements", label: "Achievements", icon: Award },
] as const;

export function UserAccountMenu({
  username,
  isAdmin,
  wallet,
  className,
}: UserAccountMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-1 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-foreground-secondary shadow-card transition-colors hover:bg-surface hover:text-foreground",
          open && "border-border-tint bg-surface text-foreground"
        )}
      >
        @{username}
        <ChevronDown
          className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[14rem] overflow-hidden rounded-xl border border-border bg-surface shadow-card-hover"
        >
          <WalletSummaryDropdown wallet={wallet} />

          <div className="border-t border-border py-1">
            {menuLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-light text-primary"
                      : "text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4 shrink-0 opacity-80" />
                  {link.label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-gold-subtle text-gold"
                    : "text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <Shield className="h-4 w-4 shrink-0 opacity-80" />
                Admin
              </Link>
            )}

            <div className="my-1 border-t border-border" />

            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0 opacity-80" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile-friendly account links (no dropdown) */
export function UserAccountMenuMobile({
  username,
  isAdmin,
  wallet,
  onNavigate,
}: {
  username: string;
  isAdmin: boolean;
  wallet: UserWalletSummary;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="mt-3 border-t border-border pt-3">
      <WalletSummaryDropdown wallet={wallet} className="mb-3" />
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Account
      </p>
      <p className="mb-2 px-3 text-sm font-semibold text-foreground">@{username}</p>
      <div className="flex flex-col gap-0.5">
        {menuLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
              pathname.startsWith(link.href)
                ? "bg-primary-light text-primary"
                : "text-muted"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
              pathname.startsWith("/admin")
                ? "bg-gold-subtle text-gold"
                : "text-muted"
            )}
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </div>
      <form action={signOut} className="mt-2">
        <Button variant="ghost" size="sm" type="submit" className="w-full justify-start">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </form>
    </div>
  );
}
