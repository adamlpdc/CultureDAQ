"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthAction = (
  prevState: { error?: string } | undefined,
  formData: FormData
) => Promise<{ error?: string } | undefined>;

interface AuthFormProps {
  action: AuthAction;
  children: React.ReactNode;
  submitLabel: string;
}

export function AuthForm({ action, children, submitLabel }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state?.error && <p className="text-sm text-loss">{state.error}</p>}
      <Button type="submit" className="w-full" loading={isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}

export { Input };
