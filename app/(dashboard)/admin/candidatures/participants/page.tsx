import { listEventApplicationsAction } from "@/actions/event-application-actions";
import { EventApplicationManager } from "@/components/admin/EventApplicationManager";

export default async function EventApplicationsPage() {
  const applications = await listEventApplicationsAction();
  return <EventApplicationManager initialApplications={applications} />;
}
