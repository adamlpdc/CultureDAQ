import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { getAssets, getCurrentUser, getProfile } from "@/lib/queries";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");

  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");

  const assets = await getAssets({ sort: "name" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Admin Panel</h1>
        <p className="mt-1 text-muted">
          Manage featured assets, trading pauses, and price overrides
        </p>
      </div>

      <AdminPanel assets={assets} />
    </div>
  );
}
