import { getCurrentUser, getAchievementsPageData } from "@/lib/queries";
import { AchievementsCollectionBar } from "@/components/achievements/achievements-collection-bar";
import { AchievementsExplorer } from "@/components/achievements/achievements-explorer";
import { AchievementsPageHeader } from "@/components/achievements/achievements-page-header";

export default async function AchievementsPage() {
  const user = await getCurrentUser();
  const data = await getAchievementsPageData(user?.id);

  return (
    <div className="space-y-4 md:space-y-5">
      <AchievementsPageHeader stats={data.stats} isLoggedIn={data.isLoggedIn} />
      <AchievementsCollectionBar collections={data.collections} />
      <AchievementsExplorer cards={data.cards} />
    </div>
  );
}
