import Link from "next/link";
import { listAdminUsersAction } from "@/actions/admin-user-actions";
import { AdminUserForm } from "@/components/admin/AdminUserForm";

export default async function CreateAdminUserPage() {
  const { permissions } = await listAdminUsersAction();
  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour aux utilisateurs
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Ajouter un utilisateur</h1>
        <p className="mt-2 text-muted-foreground">
          Créez un compte et attribuez-lui son niveau d’accès.
        </p>
      </div>
      <AdminUserForm permissions={permissions} />
    </section>
  );
}
