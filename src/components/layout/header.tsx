"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LogOut, Menu, Trophy, User, Wallet, X } from "lucide-react";
import { useState } from "react";
import { cn, formatDaq } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth";

interface HeaderProps {
  user: { email: string } | null;
  profile: { username: string; daq_balance: number; is_admin: boolean } | null;
}

const navLinks = [
  { href: "/market", label: "Market", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Header({ user, profile }: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-white">
            C
          </div>
          <span className="text-lg font-bold tracking-tight">
            Culture<span className="text-accent">DAQ</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(link.href)
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
          {profile?.is_admin && (
            <Link
              href="/admin"
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-gold/10 text-gold"
                  : "text-muted hover:text-foreground"
              )}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user && profile ? (
            <>
              <div className="rounded-xl bg-surface-elevated px-3 py-1.5 text-sm">
                <span className="text-muted">Balance: </span>
                <span className="font-semibold text-gold">
                  {formatDaq(profile.daq_balance)}
                </span>
              </div>
              <span className="text-sm text-muted">@{profile.username}</span>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
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
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                  pathname.startsWith(link.href)
                    ? "bg-accent/10 text-accent"
                    : "text-muted"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {user && profile ? (
              <div className="mt-2 border-t border-border pt-2">
                <div className="mb-2 flex items-center gap-2 px-3 text-sm">
                  <User className="h-4 w-4 text-muted" />
                  @{profile.username}
                </div>
                <div className="mb-2 px-3 text-sm font-semibold text-gold">
                  {formatDaq(profile.daq_balance)}
                </div>
                <form action={signOut}>
                  <Button variant="ghost" size="sm" type="submit" className="w-full justify-start">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </form>
              </div>
            ) : (
              <div className="mt-2 flex gap-2 border-t border-border pt-2">
                <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full">
                    Sign Up
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
