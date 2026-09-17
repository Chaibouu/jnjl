"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import {
  createAdminUserAction,
  updateAdminUserAction,
} from "@/actions/admin-user-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import charter from "@/settings/charter";

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

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  STAFF: "Staff",
  USER: "Utilisateur",
  ASSOCIATION: "Association",
  MEMBER: "Membre",
  MODERATOR: "Modérateur",
  CITIZEN: "Citoyen",
};

export function AdminUserForm({
  user,
  permissions,
  embedded = false,
  onSuccess,
  onCancel,
}: {
  user?: UserItem;
  permissions: PermissionItem[];
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
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
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/admin/users";
        }
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
      className={
        embedded
          ? "space-y-5"
          : "max-w-3xl space-y-5 rounded-xl border bg-card p-6 shadow-sm"
      }
    >
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nom complet"
          value={form.name}
          onChange={value => update("name", value)}
          required
        />
        <FormField
          label="Email"
          type="email"
          value={form.email}
          onChange={value => update("email", value)}
          required
        />
        <FormField
          label="Prénom"
          value={form.firstName}
          onChange={value => update("firstName", value)}
        />
        <FormField
          label="Nom"
          value={form.lastName}
          onChange={value => update("lastName", value)}
        />
        <FormField
          label={user ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
          type="password"
          value={form.password}
          onChange={value => update("password", value)}
          required={!user}
        />
        <Field>
          <FieldLabel>Rôle</FieldLabel>
          <Select
            value={form.role}
            onValueChange={value => update("role", value as UserRole)}
          >
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir un rôle">
                {(value: string) => ROLE_LABEL[value] ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(UserRole).map(role => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABEL[role] ?? role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.isActive}
            onCheckedChange={checked => update("isActive", Boolean(checked))}
          />
          Compte actif
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.emailVerified}
            onCheckedChange={checked =>
              update("emailVerified", Boolean(checked))
            }
          />
          Email vérifié
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Permissions</legend>
        <div className="grid gap-4 rounded-none border border-border bg-muted/40 p-4 md:grid-cols-2">
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
                  <Checkbox
                    className="mt-0.5"
                    checked={form.permissions.includes(permission.code)}
                    onCheckedChange={checked =>
                      update(
                        "permissions",
                        checked
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

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending
            ? "Enregistrement..."
            : user
              ? "Enregistrer"
              : "Créer l’utilisateur"}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-red-500 text-red-600 hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
          >
            Annuler
          </Button>
        ) : (
          <Link
            href="/admin/users"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-red-500 bg-background px-2.5 text-sm font-medium text-red-600 transition-colors hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
          >
            Annuler
          </Link>
        )}
      </div>
    </form>
  );
}

function FormField({
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
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        required={required}
        className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
      />
    </Field>
  );
}
