import Link from "next/link";
import { signIn } from "@/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

const loginErrors: Record<string, string> = {
  email_confirmation_failed:
    "We couldn't verify your email link. It may have expired — try signing up again or request a new link.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const authError = params.error ? loginErrors[params.error] : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <Card className="w-full shadow-elevated">
        <h1 className="text-display text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your CultureDAQ account</p>

        <div className="mt-6">
          {authError ? (
            <p className="mb-4 rounded-xl border border-loss-muted bg-loss-light px-4 py-3 text-sm text-loss">
              {authError}
            </p>
          ) : null}
          <AuthForm action={signIn} submitLabel="Sign In">
            <input type="hidden" name="redirect" value={params.redirect ?? "/"} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                Email
              </label>
              <Input name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                Password
              </label>
              <Input name="password" type="password" required placeholder="••••••••" />
            </div>
          </AuthForm>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:text-primary-hover">
            Join CultureDAQ
          </Link>
        </p>
      </Card>
    </div>
  );
}
