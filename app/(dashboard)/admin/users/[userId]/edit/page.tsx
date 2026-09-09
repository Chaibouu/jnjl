import Link from "next/link";
import { getAdminUserAction } from "@/actions/admin-user-actions";
import { AdminUserForm } from "@/components/admin/AdminUserForm";

export default async function EditAdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, permissions } = await getAdminUserAction(userId);
  return (
    <section className="space-y-6">
      <div>
        <Link
          href={`/admin/users/${user.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour à la fiche
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Modifier l’utilisateur</h1>
      </div>
      <AdminUserForm user={user} permissions={permissions} />
    </section>
  );
}
