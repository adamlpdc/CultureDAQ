import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MarketTicker } from "@/components/market/market-ticker";
import { getAssets, getCurrentUser, getProfile } from "@/lib/queries";

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
  const [profile, tickerAssets] = await Promise.all([
    user ? getProfile(user.id) : null,
    getAssets({ sort: "trending", limit: 10 }),
  ]);

  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col bg-background`}>
        <Header
          user={user ? { email: user.email ?? "" } : null}
          profile={
            profile
              ? {
                  username: profile.username,
                  daq_balance: profile.daq_balance,
                  is_admin: profile.is_admin,
                }
              : null
          }
        />
        <MarketTicker assets={tickerAssets} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8 lg:px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
