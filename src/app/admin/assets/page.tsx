import { PageHeader } from "@/components/ui/page-header";
import { AdminPanel } from "@/components/admin/admin-panel";
import { getAssets } from "@/lib/queries";
import Link from "next/link";

export default async function AdminAssetsPage() {
  const assets = await getAssets({ sort: "name" });
  return <div className="space-y-6"><PageHeader title="Assets" description="Search assets, manage featured status and pause individual asset trading."/><div className="text-sm"><Link href="/admin/maintenance" className="font-semibold text-primary hover:underline">Open Maintenance Tools →</Link></div><AdminPanel assets={assets}/></div>;
}
