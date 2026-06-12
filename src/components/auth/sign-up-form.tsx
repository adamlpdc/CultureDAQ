"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn, MailCheck, MailWarning } from "lucide-react";
import {
  resendSignupConfirmation,
  signUp,
  type ResendConfirmationResult,
  type SignUpResult,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";

interface SignUpFormProps {
  children: React.ReactNode;
  submitLabel: string;
}

function OutcomeCard({
  icon,
  title,
  children,
  tone = "gain",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "gain" | "neutral" | "info";
}) {
  const tones = {
    gain: "border-gain-muted bg-gain-light",
    neutral: "border-border bg-surface-muted",
    info: "border-primary/20 bg-primary-light/40",
  };

  return (
    <div
      className={`rounded-xl border px-5 py-6 ${tones[tone]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-card">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function ResendConfirmationPanel({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState<
    ResendConfirmationResult | undefined,
    FormData
  >(resendSignupConfirmation, undefined);

  if (state && "success" in state && state.success) {
    return (
      <OutcomeCard
        icon={<MailCheck className="h-5 w-5 text-gain" aria-hidden />}
        title="Verification email sent"
      >
        <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
          {state.message}
        </p>
        <p className="mt-2 text-sm text-muted">
          Sent to{" "}
          <span className="font-medium text-foreground-secondary">{state.email}</span>
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex text-sm font-medium text-primary hover:text-primary-hover"
        >
          Go to sign in
        </Link>
      </OutcomeCard>
    );
  }

  return (
    <OutcomeCard
      icon={<MailWarning className="h-5 w-5 text-primary" aria-hidden />}
      title="Email not verified yet"
      tone="info"
    >
      <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
        This email is already registered but not verified. Send a new verification email?
      </p>
      <p className="mt-2 text-sm text-muted">
        <span className="font-medium text-foreground-secondary">{email}</span>
      </p>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="email" value={email} />
        {state && "error" in state ? (
          <p className="text-sm text-loss" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" loading={isPending}>
          Send verification email
        </Button>
      </form>
      <Link
        href="/login"
        className="mt-3 inline-flex text-sm font-medium text-primary hover:text-primary-hover"
      >
        Go to sign in
      </Link>
    </OutcomeCard>
  );
}

function SignUpOutcome({ state }: { state: SignUpResult }) {
  if ("error" in state) return null;

  switch (state.status) {
    case "new_user":
      return (
        <OutcomeCard
          icon={<MailCheck className="h-5 w-5 text-gain" aria-hidden />}
          title="Check your email"
        >
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            {state.message}
          </p>
          <p className="mt-2 text-sm text-muted">
            Sent to{" "}
            <span className="font-medium text-foreground-secondary">{state.email}</span>
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:text-primary-hover"
          >
            Go to sign in
          </Link>
        </OutcomeCard>
      );

    case "existing_confirmed":
      return (
        <OutcomeCard
          icon={<LogIn className="h-5 w-5 text-foreground-secondary" aria-hidden />}
          title="Account already exists"
          tone="neutral"
        >
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            An account already exists for this email. Please sign in instead.
          </p>
          <p className="mt-2 text-sm text-muted">
            <span className="font-medium text-foreground-secondary">{state.email}</span>
          </p>
          <Link href="/login" className="mt-4 block">
            <Button type="button" className="w-full">
              Sign in
            </Button>
          </Link>
        </OutcomeCard>
      );

    case "existing_unconfirmed":
      return <ResendConfirmationPanel email={state.email} />;
  }
}

export function SignUpForm({ children, submitLabel }: SignUpFormProps) {
  const [state, formAction, isPending] = useActionState<SignUpResult | undefined, FormData>(
    signUp,
    undefined
  );

  if (state && !("error" in state)) {
    return <SignUpOutcome state={state} />;
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
