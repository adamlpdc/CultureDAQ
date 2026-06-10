import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getCurrentUser, getProfile } from "@/lib/queries";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CultureDAQ — Fantasy Cultural Stock Market",
  description:
    "Trade shares in people, brands, movies, and sports teams using fictional DAQ currency. A game for fun only.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
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
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
