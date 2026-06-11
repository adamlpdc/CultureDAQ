import { Calendar, Film, Music, Shirt, Trophy } from "lucide-react";
import type { CultureMoment } from "@/lib/culture-context";

const momentIcons = {
  film: Film,
  music: Music,
  sports: Trophy,
  fashion: Shirt,
  calendar: Calendar,
};

interface CultureContextProps {
  moment: CultureMoment;
}

export function CultureContext({ moment }: CultureContextProps) {
  const Icon = momentIcons[moment.icon];

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card md:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        Culture Context
      </p>
      <div className="mt-3 flex gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-light">
          <Icon className="h-4 w-4 text-secondary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">
            <span className="mr-1.5">{moment.emoji}</span>
            {moment.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {moment.description}
          </p>
          <p className="mt-2 text-xs text-muted-light">
            This asset is part of a live cultural moment shaping market attention.
          </p>
        </div>
      </div>
    </div>
  );
}
