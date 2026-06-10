import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gain" | "loss" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-primary text-white hover:bg-primary-hover shadow-card",
      secondary:
        "bg-surface text-foreground border border-border hover:bg-surface-muted hover:border-border-light shadow-card",
      ghost: "text-muted hover:text-foreground hover:bg-surface-muted",
      danger: "bg-loss-light text-loss border border-loss-muted hover:bg-loss-muted/50",
      gain: "bg-gain text-white hover:bg-gain-hover shadow-card",
      loss: "bg-loss text-white hover:bg-loss-hover shadow-card",
      gold: "bg-gold text-white hover:bg-gold-hover shadow-card",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm rounded-lg",
      md: "px-4 py-2.5 text-sm rounded-xl",
      lg: "px-6 py-3 text-base rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
