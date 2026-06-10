import Link from "next/link";
import { signIn } from "@/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="mt-1 text-sm text-muted">Welcome back to CultureDAQ</p>

        <div className="mt-6">
          <AuthForm action={signIn} submitLabel="Sign In">
            <input type="hidden" name="redirect" value={params.redirect ?? "/"} />
            <div>
              <label className="mb-1.5 block text-sm text-muted">Email</label>
              <Input name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Password</label>
              <Input name="password" type="password" required placeholder="••••••••" />
            </div>
          </AuthForm>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
