"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LogOut, Menu, Newspaper, Trophy, User, Wallet, X } from "lucide-react";
import { useState } from "react";
import { cn, formatDaq } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/actions/auth";

interface HeaderProps {
  user: { email: string } | null;
  profile: { username: string; daq_balance: number; is_admin: boolean } | null;
}

const navLinks = [
  { href: "/market", label: "Market", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "#", label: "News", icon: Newspaper, placeholder: true },
];

export function Header({ user, profile }: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 shadow-nav backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
        <Logo size="md" />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = !link.placeholder && pathname.startsWith(link.href);
            if (link.placeholder) {
              return (
                <span
                  key={link.label}
                  className="flex cursor-default items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-muted-light"
                  title="Coming soon"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </span>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-primary-light text-primary shadow-card"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          {profile?.is_admin && (
            <Link
              href="/admin"
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                pathname.startsWith("/admin")
                  ? "bg-gold-subtle text-gold shadow-card"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              )}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user && profile ? (
            <>
              <div className="rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm shadow-card">
                <span className="text-muted">Balance </span>
                <span className="text-stat font-bold text-gold">
                  {formatDaq(profile.daq_balance)}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground-secondary">
                @{profile.username}
              </span>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
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

        <button
          className="rounded-lg p-2 text-foreground hover:bg-surface-muted md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-surface px-4 py-4 shadow-card md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) =>
              link.placeholder ? (
                <span
                  key={link.label}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-light"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </span>
              ) : (
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
              )
            )}
            {user && profile ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-2 flex items-center gap-2 px-3 text-sm text-foreground-secondary">
                  <User className="h-4 w-4 text-muted" />
                  @{profile.username}
                </div>
                <div className="mb-3 px-3 text-sm font-bold text-gold">
                  {formatDaq(profile.daq_balance)}
                </div>
                <form action={signOut}>
                  <Button variant="ghost" size="sm" type="submit" className="w-full justify-start">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </form>
              </div>
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
