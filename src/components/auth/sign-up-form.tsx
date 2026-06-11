"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signUp, type SignUpResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";

interface SignUpFormProps {
  children: React.ReactNode;
  submitLabel: string;
}

export function SignUpForm({ children, submitLabel }: SignUpFormProps) {
  const [state, formAction, isPending] = useActionState<SignUpResult | undefined, FormData>(
    signUp,
    undefined
  );

  if (state && "success" in state && state.success) {
    return (
      <div
        className="rounded-xl border border-gain-muted bg-gain-light px-5 py-6"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-card">
            <MailCheck className="h-5 w-5 text-gain" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Check your email</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
              {state.message}
            </p>
            {state.email ? (
              <p className="mt-2 text-sm text-muted">
                Sent to{" "}
                <span className="font-medium text-foreground-secondary">{state.email}</span>
              </p>
            ) : null}
            <Link
              href="/login"
              className="mt-4 inline-flex text-sm font-medium text-primary hover:text-primary-hover"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state && "error" in state ? (
        <p className="text-sm text-loss" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" loading={isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
