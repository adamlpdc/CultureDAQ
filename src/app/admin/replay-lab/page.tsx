import { notFound, redirect } from "next/navigation";
import { ReplayLab } from "@/components/admin/replay-lab";
import { PageHeader } from "@/components/ui/page-header";
import { isCultureIntelligenceEnabled } from "@/lib/env";
import { createCultureEventService } from "@/lib/culture-intelligence/service";
import { DEFAULT_REPLAY_BALANCE, runReplayLab } from "@/lib/culture-intelligence/replay-lab";
import { getAssets, getCurrentUser, getProfile } from "@/lib/queries";

export default async function ReplayLabPage() {
  if (!isCultureIntelligenceEnabled()) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/replay-lab");
  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");

  const [events, assets] = await Promise.all([
    createCultureEventService().list(),
    getAssets({ sort: "name" }),
  ]);
  const initialRun = runReplayLab({
    events,
    assets: assets.map((asset) => ({
      slug: asset.slug,
      name: asset.name,
      livePrice: asset.current_price,
    })),
    config: DEFAULT_REPLAY_BALANCE,
    name: "Default balance",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Replay & Balancing Lab"
        description="Replay historical CultureEvents through Market Engine v2 without changing production prices."
      />
      <ReplayLab initialRun={initialRun} />
    </div>
  );
}
