import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 max-w-sm text-muted">
        This asset or page doesn&apos;t exist in the CultureDAQ market.
      </p>
      <Link href="/" className="mt-8">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
