import { listAdminUsersAction } from "@/actions/admin-user-actions";
import { AdminUserManager } from "@/components/admin/AdminUserManager";

export default async function AdminUsersPage() {
  const data = await listAdminUsersAction();
  return <AdminUserManager {...data} />;
}
