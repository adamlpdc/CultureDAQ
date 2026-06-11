"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BarChart3, Menu, Trophy, Wallet, X } from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserAccountMenu, UserAccountMenuMobile } from "@/components/layout/user-account-menu";
import { WalletSummaryCompact } from "@/components/layout/wallet-summary";
import type { UserWalletSummary } from "@/lib/portfolio-value";
import type { Notification } from "@/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

interface HeaderProps {
  user: { email: string } | null;
  profile: { username: string; is_admin: boolean } | null;
  wallet: UserWalletSummary | null;
  unreadNotificationCount?: number;
  recentNotifications?: Notification[];
}

const navLinks = [
  { href: "/market", label: "Market", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/achievements", label: "Achievements", icon: Award },
];

export function Header({
  user,
  profile,
  wallet,
  unreadNotificationCount = 0,
  recentNotifications = [],
}: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 shadow-nav backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
        <Logo size="md" />

        <nav className="hidden items-center gap-0.5 md:flex lg:gap-1">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 lg:gap-2 lg:px-3.5",
                  isActive
                    ? "bg-primary-light text-primary shadow-card"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user && profile && wallet ? (
            <>
              <Link
                href="/portfolio"
                className="rounded-xl border border-border bg-surface-muted px-3.5 py-2 shadow-card transition-colors hover:border-border-tint hover:bg-surface"
              >
                <WalletSummaryCompact wallet={wallet} />
              </Link>
              <NotificationBell
                initialUnreadCount={unreadNotificationCount}
                initialNotifications={recentNotifications}
              />
              <UserAccountMenu
                username={profile.username}
                isAdmin={profile.is_admin}
                wallet={wallet}
              />
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Join CultureDAQ</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {user && profile && (
            <NotificationBell
              initialUnreadCount={unreadNotificationCount}
              initialNotifications={recentNotifications}
            />
          )}
          <button
            className="rounded-lg p-2 text-foreground hover:bg-surface-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-surface px-4 py-4 shadow-card md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
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
            {user && profile && wallet ? (
              <UserAccountMenuMobile
                username={profile.username}
                isAdmin={profile.is_admin}
                wallet={wallet}
                onNavigate={() => setMobileOpen(false)}
              />
            ) : (
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full">
                    Join
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
