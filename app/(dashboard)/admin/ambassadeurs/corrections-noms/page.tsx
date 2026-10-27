import { listNameChangeRequestsAction } from "@/actions/name-change-actions";
import { NameChangeRequests } from "@/components/admin/NameChangeRequests";
import charter from "@/settings/charter";

export const dynamic = "force-dynamic";

export default async function NameChangeRequestsPage() {
  const requests = await listNameChangeRequestsAction();
  if (!requests) {
    return <p className="p-6 text-sm text-muted-foreground">Cet espace est réservé aux administrateurs.</p>;
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Ambassadeurs
        </p>
        <h1 className="mt-1 text-2xl font-bold">Corrections de noms</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le nom de la candidature figure sur les documents officiels (attestations, engagement, badge) : les ambassadeurs ne
          peuvent pas le modifier eux-mêmes. Vérifiez la demande avant de l&apos;accepter.
        </p>
      </div>
      <NameChangeRequests initial={requests} />
    </section>
  );
}
