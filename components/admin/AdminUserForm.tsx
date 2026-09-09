"use client";

import { useState, useTransition } from "react";
import { UserRole } from "@prisma/client";
import {
  createAdminUserAction,
  updateAdminUserAction,
} from "@/actions/admin-user-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type PermissionItem = { code: string; label: string; category: string | null };
type UserItem = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: Date | null;
  permissions: string[];
};
type UserForm = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  permissions: string[];
};
const emptyForm: UserForm = {
  name: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: UserRole.USER,
  isActive: true,
  emailVerified: false,
  permissions: [],
};

export function AdminUserForm({
  user,
  permissions,
}: {
  user?: UserItem;
  permissions: PermissionItem[];
}) {
  const [form, setForm] = useState<UserForm>(
    user
      ? {
          name: user.name ?? "",
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.email ?? "",
          password: "",
          role: user.role,
          isActive: user.isActive,
          emailVerified: Boolean(user.emailVerified),
          permissions: user.permissions,
        }
      : emptyForm
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const grouped = permissions.reduce<Record<string, PermissionItem[]>>(
    (groups, permission) => {
      const category = permission.category ?? "Autres";
      (groups[category] ??= []).push(permission);
      return groups;
    },
    {}
  );
  const update = (field: keyof UserForm, value: string | boolean | string[]) =>
    setForm(current => ({ ...current, [field]: value }));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (user) {
          await updateAdminUserAction(user.id, form);
        } else {
          await createAdminUserAction(form);
        }
        window.location.href = "/admin/users";
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
    <form
      onSubmit={submit}
      className="max-w-3xl space-y-6 rounded-xl border bg-card p-6 shadow-sm"
    >
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Nom complet"
          value={form.name}
          onChange={value => update("name", value)}
          required
        />
        <Field
          label="Prénom"
          value={form.firstName}
          onChange={value => update("firstName", value)}
        />
        <Field
          label="Nom"
          value={form.lastName}
          onChange={value => update("lastName", value)}
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={value => update("email", value)}
          required
        />
        <Field
          label={user ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
          type="password"
          value={form.password}
          onChange={value => update("password", value)}
          required={!user}
        />
      </div>
      <label className="block space-y-2 text-sm font-medium">
        Rôle
        <select
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={form.role}
          onChange={event => update("role", event.target.value)}
        >
          {Object.values(UserRole).map(role => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={event => update("isActive", event.target.checked)}
          />
          Compte actif
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.emailVerified}
            onChange={event => update("emailVerified", event.target.checked)}
          />
          Email vérifié
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Permissions</legend>
        <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                {category}
              </p>
              {items.map(permission => (
                <label
                  key={permission.code}
                  className="flex items-start gap-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(permission.code)}
                    onChange={event =>
                      update(
                        "permissions",
                        event.target.checked
                          ? [...form.permissions, permission.code]
                          : form.permissions.filter(
                              code => code !== permission.code
                            )
                      )
                    }
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Enregistrement..."
            : user
              ? "Enregistrer"
              : "Créer l’utilisateur"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/users">Annuler</Link>
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      {label}
      <Input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        required={required}
      />
    </label>
  );
}
