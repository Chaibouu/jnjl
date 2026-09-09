"use client";

import { useState, useTransition } from "react";
import { Check, KeyRound, Save, UserRound } from "lucide-react";
import {
  changeCurrentPasswordAction,
  updateCurrentProfileAction,
} from "@/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  image: string | null;
  isActive: boolean;
  emailVerified: Date | null;
  isTwoFactorEnabled: boolean;
  profile: {
    city: string | null;
    institution: string | null;
    educationLevel: string | null;
    bio: string | null;
    skills: string[];
    interests: string[];
  } | null;
};
type Props = { profile: Profile };

export function ProfileEditor({ profile }: Props) {
  const [tab, setTab] = useState<"profile" | "security">("profile");
  const [form, setForm] = useState({
    name: profile.name ?? "",
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    city: profile.profile?.city ?? "",
    institution: profile.profile?.institution ?? "",
    educationLevel: profile.profile?.educationLevel ?? "",
    bio: profile.profile?.bio ?? "",
    skills: profile.profile?.skills.join(", ") ?? "",
    interests: profile.profile?.interests.join(", ") ?? "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const update = (field: string, value: string) =>
    setForm(current => ({ ...current, [field]: value }));
  const submitProfile = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await updateCurrentProfileAction({
          ...form,
          skills: splitList(form.skills),
          interests: splitList(form.interests),
        });
        setMessage("Profil mis à jour avec succès.");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };
  const submitPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await changeCurrentPasswordAction(password);
        setPassword({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setMessage("Mot de passe modifié avec succès.");
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
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {(profile.name ?? profile.email ?? "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {profile.name || "Sans nom"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {profile.email}
            </p>
          </div>
        </div>
        <nav className="mt-6 space-y-1">
          <button
            type="button"
            onClick={() => setTab("profile")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${tab === "profile" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <UserRound className="h-4 w-4" />
            Informations personnelles
          </button>
          <button
            type="button"
            onClick={() => setTab("security")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${tab === "security" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <KeyRound className="h-4 w-4" />
            Sécurité
          </button>
        </nav>
        <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          <p>
            Rôle :{" "}
            <span className="font-medium text-foreground">{profile.role}</span>
          </p>
          <p className="mt-1">
            Email {profile.emailVerified ? "vérifié" : "non vérifié"}
          </p>
        </div>
      </aside>
      <main className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Mon compte
          </p>
          <h1 className="mt-1 text-3xl font-bold">Mon profil</h1>
          <p className="mt-2 text-muted-foreground">
            Consultez et mettez à jour vos informations personnelles.
          </p>
        </div>
        {message && (
          <p className="mb-4 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
            <Check className="h-4 w-4" />
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {tab === "profile" ? (
          <form onSubmit={submitProfile} className="space-y-5">
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
                value={profile.email ?? ""}
                onChange={() => undefined}
                disabled
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Ville"
                value={form.city}
                onChange={value => update("city", value)}
              />
              <Field
                label="Institution"
                value={form.institution}
                onChange={value => update("institution", value)}
              />
              <Field
                label="Niveau d’étude"
                value={form.educationLevel}
                onChange={value => update("educationLevel", value)}
              />
              <Field
                label="Compétences"
                value={form.skills}
                onChange={value => update("skills", value)}
                placeholder="Ex. Gestion, Communication"
              />
              <Field
                label="Centres d’intérêt"
                value={form.interests}
                onChange={value => update("interests", value)}
                placeholder="Ex. Leadership, Innovation"
              />
            </div>
            <label className="block space-y-2 text-sm font-medium">
              Biographie
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                value={form.bio}
                onChange={event => update("bio", event.target.value)}
              />
            </label>
            <Button type="submit" disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending
                ? "Enregistrement..."
                : "Enregistrer les modifications"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitPassword} className="max-w-xl space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Mot de passe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Utilisez un mot de passe unique d’au moins 8 caractères.
              </p>
            </div>
            <Field
              label="Mot de passe actuel"
              type="password"
              value={password.currentPassword}
              onChange={value =>
                setPassword(current => ({ ...current, currentPassword: value }))
              }
              required
            />
            <Field
              label="Nouveau mot de passe"
              type="password"
              value={password.newPassword}
              onChange={value =>
                setPassword(current => ({ ...current, newPassword: value }))
              }
              required
            />
            <Field
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={password.confirmPassword}
              onChange={value =>
                setPassword(current => ({ ...current, confirmPassword: value }))
              }
              required
            />
            <Button type="submit" disabled={isPending}>
              <KeyRound className="mr-2 h-4 w-4" />
              {isPending ? "Modification..." : "Modifier le mot de passe"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      {label}
      <Input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}
