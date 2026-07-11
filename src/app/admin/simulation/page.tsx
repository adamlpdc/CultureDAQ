import { redirect } from "next/navigation";
import { AttentionSimulationPanel } from "@/components/admin/attention-simulation";
import { getCurrentUser, getProfile } from "@/lib/queries";

export default async function AdminSimulationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/simulation");

  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");

  return <AttentionSimulationPanel />;
}
