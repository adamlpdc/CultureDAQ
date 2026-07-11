import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AchievementProvider } from "@/components/achievements/achievement-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MarketTicker } from "@/components/market/market-ticker";
import { getAssets, getCurrentUser, getPortfolioSummary, getProfile } from "@/lib/queries";
import { getUnreadCount, getUserNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CultureDAQ — The Cultural Exchange",
  description:
    "Trade momentum in culture. Build your portfolio, compete on leaderboards, and track the assets shaping entertainment, sport, and brands.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const supabase = user ? await createClient() : null;
  const [profile, portfolioSummary, tickerAssets, unreadNotificationCount, recentNotifications] =
    await Promise.all([
      user ? getProfile(user.id) : null,
      user ? getPortfolioSummary(user.id) : null,
      getAssets({ sort: "trending", limit: 10 }),
      user && supabase
        ? getUnreadCount(supabase, user.id).catch(() => 0)
        : Promise.resolve(0),
      user && supabase
        ? getUserNotifications(supabase, user.id, { limit: 8 }).catch(() => [])
        : Promise.resolve([]),
    ]);

  const wallet =
    portfolioSummary != null
      ? {
          portfolioValue: portfolioSummary.total_value,
          cashBalance: portfolioSummary.daq_balance,
          holdingsValue: portfolioSummary.holdings_value,
        }
      : null;

  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col bg-background`}>
        <AchievementProvider isLoggedIn={!!user}>
          <Header
            user={user ? { email: user.email ?? "" } : null}
            profile={
              profile
                ? {
                    username: profile.username,
                    is_admin: profile.is_admin,
                    avatar_style: profile.avatar_style,
                  }
                : null
            }
            wallet={wallet}
            unreadNotificationCount={unreadNotificationCount}
            recentNotifications={recentNotifications}
          />
          <MarketTicker assets={tickerAssets} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8 lg:px-6">
            {children}
          </main>
          <Footer />
        </AchievementProvider>
      </body>
    </html>
  );
}
