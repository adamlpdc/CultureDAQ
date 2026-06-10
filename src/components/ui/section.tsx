import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type SectionVariant = "default" | "muted" | "gain" | "loss" | "featured";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  variant?: SectionVariant;
}

const variantClasses: Record<SectionVariant, string> = {
  default: "",
  muted: "rounded-2xl bg-section p-6 md:p-8",
  gain: "rounded-2xl bg-section-gain p-6 md:p-8",
  loss: "rounded-2xl bg-section-loss p-6 md:p-8",
  featured: "rounded-2xl border border-border-tint bg-primary-subtle/40 p-6 md:p-8",
};

export function Section({
  variant = "default",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(variantClasses[variant], className)} {...props}>
      {children}
    </section>
  );
}
