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

export default async function CultureEventsPage() {
  if (!isCultureIntelligenceV1Enabled()) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin/culture-events");

  const profile = await getProfile(user.id);
  if (!profile?.is_admin) redirect("/");

  const events = await createCultureEventService().list();
  const expectations = calculateAssetExpectations(events, new Date(), getExpectationConfigFromEnv());
  const assets = await getAssets({ sort: "name" });
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
      <CultureEventsTable events={events} expectations={expectations} simulations={simulations} assets={assets.map(({ id, slug, name }) => ({ id, slug, name }))} />
    </div>
  );
}
