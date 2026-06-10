import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted-light shadow-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
