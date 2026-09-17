"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Eye,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { UserRole } from "@prisma/client";
import {
  deleteAdminUserAction,
  listAdminUsersAction,
  toggleAdminUserAction,
} from "@/actions/admin-user-actions";
import { AdminUserCreateDialog } from "@/components/admin/AdminUserCreateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UserItem = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: Date | null;
  isTwoFactorEnabled: boolean;
  permissions: string[];
};
type PermissionItem = { code: string; label: string; category: string | null };

export function AdminUserManager({
  users: initialUsers,
  permissions,
}: {
  users: UserItem[];
  permissions: PermissionItem[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? users.filter(user =>
          `${user.name} ${user.email} ${user.role}`
            .toLowerCase()
            .includes(query)
        )
      : users;
  }, [search, users]);

  const toggle = (user: UserItem) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const updated = await toggleAdminUserAction(user.id);
        setUsers(current =>
          current.map(item => (item.id === user.id ? updated : item))
        );
        setMessage(
          updated.isActive ? "Utilisateur activé" : "Utilisateur désactivé"
        );
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };

  const refreshAfterCreate = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const { users: refreshed } = await listAdminUsersAction();
        setUsers(refreshed);
        setMessage("Utilisateur créé avec succès.");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible de rafraîchir les utilisateurs"
        );
      }
    });
  };

  const remove = (user: UserItem) => {
    if (
      !window.confirm(
        `Supprimer ${user.name ?? user.email ?? "cet utilisateur"} ?`
      )
    )
      return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deleteAdminUserAction(user.id);
        setUsers(current => current.filter(item => item.id !== user.id));
        setMessage("Utilisateur supprimé");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-bold">Utilisateurs</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez les comptes et leurs niveaux d’accès.
          </p>
        </div>
        <AdminUserCreateDialog
          permissions={permissions}
          onCreated={refreshAfterCreate}
        />
      </header>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liste des utilisateurs</h2>
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} compte
              {filteredUsers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
        {message && (
          <p className="border-b px-5 py-3 text-sm text-green-600">{message}</p>
        )}
        {error && (
          <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Utilisateur</th>
                <th className="px-5 py-4">Rôle</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4">Sécurité</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map(user => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                        {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.name || "Sans nom"}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.isActive ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      {user.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {user.isTwoFactorEnabled
                      ? "2FA activée"
                      : "2FA non activée"}
                    <br />
                    {user.emailVerified ? "Email vérifié" : "Email non vérifié"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <ActionLink
                        href={`/admin/users/${user.id}`}
                        label="Voir"
                        icon={<Eye className="h-4 w-4" />}
                      />
                      <ActionLink
                        href={`/admin/users/${user.id}/edit`}
                        label="Modifier"
                        icon={<Pencil className="h-4 w-4" />}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title={user.isActive ? "Désactiver" : "Activer"}
                        onClick={() => toggle(user)}
                        disabled={isPending}
                      >
                        {user.isActive ? (
                          <UserX className="h-4 w-4 text-amber-600" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Supprimer"
                        onClick={() => remove(user)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ActionLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Button size="icon" variant="ghost" title={label} nativeButton={false} render={<Link href={href} />}>
      {icon}
    </Button>
  );
}
