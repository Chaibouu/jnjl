import Link from "next/link";
import { getAdminUserAction } from "@/actions/admin-user-actions";
import { Button } from "@/components/ui/button";

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user } = await getAdminUserAction(userId);
  return (
    <section className="space-y-6">
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Retour aux utilisateurs
      </Link>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Fiche utilisateur</p>
            <h1 className="mt-1 text-3xl font-bold">
              {user.name || "Sans nom"}
            </h1>
            <p className="mt-1 text-muted-foreground">{user.email}</p>
          </div>
          <Button asChild>
            <Link href={`/admin/users/${user.id}/edit`}>Modifier</Link>
          </Button>
        </div>
        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <Detail label="Rôle" value={user.role} />
          <Detail
            label="Statut"
            value={user.isActive ? "Actif" : "Désactivé"}
          />
          <Detail label="Email" value={user.email || "-"} />
          <Detail
            label="Authentification 2FA"
            value={user.isTwoFactorEnabled ? "Activée" : "Non activée"}
          />
          <Detail
            label="Permissions"
            value={
              user.permissions.length ? user.permissions.join(", ") : "Aucune"
            }
          />
        </dl>
      </div>
    </section>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
