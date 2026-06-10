import { Calendar, Film, Music, Shirt, Trophy } from "lucide-react";
import { CULTURE_MOMENTS } from "@/lib/constants";

const momentIcons = {
  film: Film,
  music: Music,
  sports: Trophy,
  fashion: Shirt,
  calendar: Calendar,
};

export function CultureMoments() {
  return (
    <div className="flex flex-col gap-7 rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-7 lg:flex-row lg:items-stretch lg:gap-12 lg:py-8">
      <div className="flex shrink-0 flex-col justify-center border-border lg:w-56 lg:border-r lg:pr-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          On the radar
        </p>
        <h2 className="mt-2.5 text-xl font-bold leading-tight text-foreground sm:text-2xl">
          Culture Moments
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Why attention is flowing through the market — the cultural themes behind the moves.
        </p>
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CULTURE_MOMENTS.map((moment) => {
          const Icon = momentIcons[moment.icon];
          return (
            <div
              key={moment.title}
              className="flex h-full min-h-[108px] flex-col rounded-xl border border-border/80 bg-surface-muted/30 p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-light">
                <Icon className="h-3.5 w-3.5 text-secondary" />
              </div>
              <h3 className="mt-3.5 text-[13px] font-bold leading-tight text-foreground">
                <span className="mr-1">{moment.emoji}</span>
                {moment.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">
                {moment.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
