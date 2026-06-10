import Link from "next/link";
import { signUp } from "@/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STARTING_DAQ } from "@/lib/constants";
import { formatDaq } from "@/lib/utils";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="mt-1 text-sm text-muted">
          Start with {formatDaq(STARTING_DAQ)} — fictional currency for fun only
        </p>

        <div className="mt-6">
          <AuthForm action={signUp} submitLabel={`Sign Up & Get ${formatDaq(STARTING_DAQ)}`}>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Username</label>
              <Input
                name="username"
                required
                placeholder="yourname"
                pattern="[a-zA-Z0-9_]+"
                title="Letters, numbers, and underscores only"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Email</label>
              <Input name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Password</label>
              <Input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
          </AuthForm>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          DAQ is fictional virtual currency with no real-world value. This is a
          game, not real-money trading.
        </p>

        <p className="mt-2 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
