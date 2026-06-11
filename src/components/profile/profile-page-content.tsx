"use client";

import { Suspense } from "react";
import { ProfileAchievementsTab } from "@/components/profile/profile-achievements-tab";
import { ProfileOverview } from "@/components/profile/profile-overview";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { ProfileTabs, type ProfileTab } from "@/components/profile/profile-tabs";
import { LoadingSpinner } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import type { ProfilePageData } from "@/lib/profile";

interface ProfilePageContentProps {
  data: ProfilePageData;
  activeTab: ProfileTab;
}

export function ProfilePageContent({ data, activeTab }: ProfilePageContentProps) {
  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="Profile"
        description="Your CultureDAQ identity — progression, stats, and player card."
      />

      <Suspense fallback={<LoadingSpinner />}>
        <ProfileTabs active={activeTab} />
      </Suspense>

      {activeTab === "overview" && <ProfileOverview data={data} />}
      {activeTab === "achievements" && <ProfileAchievementsTab data={data.achievements} />}
      {activeTab === "settings" && <ProfileSettings data={data} />}
    </div>
  );
}
