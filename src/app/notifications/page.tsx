import { redirect } from "next/navigation";
import { NotificationsPageContent } from "@/components/notifications/notifications-page-content";
import { getUserNotifications } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/notifications");

  const supabase = await createClient();
  const notifications = await getUserNotifications(supabase, user.id, {
    limit: 100,
  });

  return <NotificationsPageContent notifications={notifications} />;
}
