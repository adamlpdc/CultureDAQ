import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getAssets, getCurrentUser, getProfile } from "@/lib/queries";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");

  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");

  const assets = await getAssets({ sort: "name" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Manage featured assets, trading pauses, and price overrides."
      />

      <p className="text-sm">
        <Link href="/admin/simulation" className="font-medium text-primary hover:underline">
          Open Attention Market Simulation →
        </Link>
      </p>

      <AdminPanel assets={assets} />
    </div>
  );
}
