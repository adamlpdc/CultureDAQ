import { notFound, redirect } from "next/navigation";
import { CultureEventsTable } from "@/components/admin/culture-events-table";
import { PageHeader } from "@/components/ui/page-header";
import { isCultureIntelligenceV1Enabled } from "@/lib/env";
import { createCultureEventService } from "@/lib/culture-intelligence/service";
import {
  calculateAssetExpectations,
  getExpectationConfigFromEnv,
} from "@/lib/culture-intelligence/expectation";
import { getCurrentUser, getProfile } from "@/lib/queries";
import { getAssets } from "@/lib/queries";
import { getPriceV2ConfigFromEnv, simulatePriceV2 } from "@/lib/culture-intelligence/price-v2";
import { SuggestedEventsQueue } from "@/components/admin/suggested-events-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDiscoveryMonitoring, suggestionFromRow } from "@/lib/culture-intelligence/discovery-service";
import { isCultureIntelligenceV2Enabled } from "@/lib/env";

export default async function CultureEventsPage() {
  if (!isCultureIntelligenceV1Enabled()) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/culture-events");

  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");

  const events = await createCultureEventService().list();
  const expectations = calculateAssetExpectations(events, new Date(), getExpectationConfigFromEnv());
  const assets = await getAssets({ sort: "name" });
  const discoveryEnabled = isCultureIntelligenceV2Enabled();
  let suggestions: ReturnType<typeof suggestionFromRow>[] = [];
  let monitoring = calculateDiscoveryMonitoring([], 0, 0);
  if (discoveryEnabled) {
    const admin = createAdminClient();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [{ data: suggestionRows }, { data: runRows }] = await Promise.all([
      admin.from("culture_event_suggestions").select("*").order("created_at", { ascending: false }).limit(200),
      admin.from("culture_discovery_runs").select("duplicate_count,articles_seen").gte("started_at", today.toISOString()),
    ]);
    suggestions = (suggestionRows ?? []).map((row) => suggestionFromRow(row));
    const todayRows = (suggestionRows ?? []).filter((row) => new Date(row.created_at).getTime() >= today.getTime());
    monitoring = calculateDiscoveryMonitoring(todayRows, (runRows ?? []).reduce((sum, row) => sum + row.duplicate_count, 0), (runRows ?? []).reduce((sum, row) => sum + row.articles_seen, 0));
  }
  const simulations = events.flatMap((event) => {
    if (
      event.actualAttention == null ||
      event.surpriseDelta == null ||
      event.momentumScore == null ||
      event.viralMultiplier == null
    ) return [];
    const actualAttention = event.actualAttention;
    const surpriseDelta = event.surpriseDelta;
    const momentumScore = event.momentumScore;
    const viralMultiplier = event.viralMultiplier;
    return event.affectedAssets.flatMap((affectedAsset) => {
      const asset = assets.find((item) => item.slug === affectedAsset.slug);
      if (!asset) return [];
      const expectation = expectations.find((item) => item.assetSlug === asset.slug);
      return [simulatePriceV2({
        assetSlug: asset.slug,
        assetName: asset.name,
        cultureEventId: event.id,
        cultureEventTitle: event.title,
        oldPrice: asset.current_price,
        expectationScore: expectation?.currentExpectation ?? 0,
        expectedAttention: event.expectedAttention,
        actualAttention,
        surpriseDelta,
        momentumScore,
        viralMultiplier,
        simulatedAt: event.resolvedAt ?? undefined,
      }, getPriceV2ConfigFromEnv())];
    });
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Culture Intelligence Events"
        description="Manual-first Culture Intelligence queue feeding verified events into Market Engine v2."
      />
      <SuggestedEventsQueue suggestions={suggestions} monitoring={monitoring} enabled={discoveryEnabled} assets={assets.map(({ id, slug, name }) => ({ id, slug, name }))} />
      <CultureEventsTable events={events} expectations={expectations} simulations={simulations} assets={assets.map(({ id, slug, name }) => ({ id, slug, name }))} />
    </div>
  );
}
