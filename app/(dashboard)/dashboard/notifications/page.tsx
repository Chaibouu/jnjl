import { listMyNotificationsAction } from "@/actions/notification-actions";
import { getBroadcastContextAction } from "@/actions/notification-broadcast-actions";
import { AmbassadorBroadcastForm } from "@/components/admin/AmbassadorBroadcastForm";
import { NotificationList } from "@/components/NotificationList";

export default async function NotificationsPage() {
  const [items, broadcast] = await Promise.all([listMyNotificationsAction(), getBroadcastContextAction()]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {broadcast && <AmbassadorBroadcastForm regions={broadcast.regions} />}
      <NotificationList initialItems={items} />
    </div>
  );
}
