import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  link?: boolean;
}

export function Logo({ className, size = "md", link = true }: LogoProps) {
  const sizes = {
    sm: { icon: "h-7 w-7 text-xs", text: "text-base" },
    md: { icon: "h-8 w-8 text-sm", text: "text-lg" },
    lg: { icon: "h-10 w-10 text-base", text: "text-2xl" },
  };

  const content = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-primary font-bold text-white shadow-card",
          sizes[size].icon
        )}
      >
        C
      </span>
      <span className={cn("font-bold tracking-tight", sizes[size].text)}>
        <span className="text-secondary">Culture</span>
        <span className="text-primary">DAQ</span>
      </span>
    </span>
  );

  if (link) {
    return <Link href="/">{content}</Link>;
  }

  return content;
}
