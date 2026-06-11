import { AchievementsCollectionBar } from "@/components/achievements/achievements-collection-bar";
import { AchievementsExplorer } from "@/components/achievements/achievements-explorer";
import { AchievementsPageHeader } from "@/components/achievements/achievements-page-header";
import type { AchievementsPageData } from "@/lib/queries";

interface ProfileAchievementsTabProps {
  data: AchievementsPageData;
}

export function ProfileAchievementsTab({ data }: ProfileAchievementsTabProps) {
  return (
    <div className="space-y-4 md:space-y-5">
      <AchievementsPageHeader stats={data.stats} isLoggedIn={data.isLoggedIn} />
      <AchievementsCollectionBar collections={data.collections} />
      <AchievementsExplorer cards={data.cards} />
    </div>
  );
}
