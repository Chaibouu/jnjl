import { listMyNotificationsAction } from "@/actions/notification-actions";
import { NotificationList } from "@/components/NotificationList";

export default async function NotificationsPage() {
  const items = await listMyNotificationsAction();
  return <NotificationList initialItems={items} />;
}
