import { BarChart3, Rocket, Trophy, Zap } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Live Momentum",
    desc: "Prices move with trading pressure.",
  },
  {
    icon: Trophy,
    title: "Compete Globally",
    desc: "Climb the leaderboard.",
  },
  {
    icon: BarChart3,
    title: "Build Portfolios",
    desc: "Diversify across culture.",
  },
  {
    icon: Rocket,
    title: "Be Early",
    desc: "Spot rising assets first.",
  },
];

export function FeatureCards() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
      {features.map((item) => (
        <div
          key={item.title}
          className="flex h-full min-h-[68px] items-start gap-3 rounded-xl border border-border bg-surface px-3 py-3 shadow-card"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light">
            <item.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold leading-tight text-foreground">{item.title}</h3>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{item.desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
