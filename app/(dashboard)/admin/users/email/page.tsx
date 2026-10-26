import { ForbiddenError } from "@/lib/forbidden-error";
import { requireSuperAdmin } from "@/actions/requirePermission";
import { ChangeUserEmail } from "@/components/admin/ChangeUserEmail";
import charter from "@/settings/charter";

export const dynamic = "force-dynamic";

export default async function ChangeUserEmailPage() {
  try {
    await requireSuperAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return <p className="p-6 text-sm text-muted-foreground">Cet espace est réservé au Super Admin.</p>;
    }
    throw error;
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Super Admin
        </p>
        <h1 className="mt-1 text-2xl font-bold">Changer l&apos;e-mail d&apos;un utilisateur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recherchez le compte, saisissez la bonne adresse : elle remplace l&apos;ancienne sur le compte et sur ses
          candidatures. L&apos;utilisateur se connecte ensuite avec la nouvelle adresse.
        </p>
      </div>
      <ChangeUserEmail />
    </section>
  );
}
