import { redirect } from "next/navigation";
import { ProfilePageContent } from "@/components/profile/profile-page-content";
import type { ProfileTab } from "@/components/profile/profile-tabs";
import { getCurrentUser } from "@/lib/queries";
import { getProfilePageData } from "@/lib/profile";

const VALID_TABS = new Set<ProfileTab>(["overview", "achievements", "settings"]);

function parseTab(tab?: string): ProfileTab {
  if (tab && VALID_TABS.has(tab as ProfileTab)) {
    return tab as ProfileTab;
  }
  return "overview";
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/profile");

  const params = await searchParams;
  const activeTab = parseTab(params.tab);

  const data = await getProfilePageData(user.id, user.email ?? "");
  if (!data) redirect("/login?redirect=/profile");

  return <ProfilePageContent data={data} activeTab={activeTab} />;
}
