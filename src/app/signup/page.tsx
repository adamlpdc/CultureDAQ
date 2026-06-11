import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { STARTING_DAQ } from "@/lib/constants";
import { formatDaq } from "@/lib/utils";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <Card className="w-full shadow-elevated">
        <h1 className="text-display text-2xl font-bold text-foreground">Join CultureDAQ</h1>
        <p className="mt-1 text-sm text-muted">
          Start with {formatDaq(STARTING_DAQ)} and build your cultural portfolio
        </p>

        <div className="mt-6">
          <SignUpForm submitLabel={`Create Account · ${formatDaq(STARTING_DAQ)}`}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                Username
              </label>
              <Input
                name="username"
                required
                placeholder="yourname"
                pattern="[a-zA-Z0-9_]+"
                title="Letters, numbers, and underscores only"
              />
            </div>
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
              <Input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
          </SignUpForm>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
