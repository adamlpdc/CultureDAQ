import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-6xl font-bold text-accent">404</h1>
      <p className="mt-4 text-xl font-semibold">Asset not found</p>
      <p className="mt-2 text-muted">This page doesn&apos;t exist in the market.</p>
      <Link href="/" className="mt-6">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
