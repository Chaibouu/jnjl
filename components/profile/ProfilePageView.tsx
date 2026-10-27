"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  changeCurrentPasswordAction,
  updateCurrentProfileAction,
} from "@/actions/profile-actions";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { NameChangeRequestForm } from "@/components/profile/NameChangeRequestForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import charter from "@/settings/charter";
import type { ProfileInput } from "@/schemas/profile";

export type ProfileData = {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  image: string | null;
  isActive: boolean;
  emailVerified: Date | null;
  isTwoFactorEnabled: boolean;
  /** Ambassadeur : le nom est celui de sa candidature et ne se modifie pas ici (demande de correction à un admin). */
  nameLocked?: boolean;
  profile: {
    city: string | null;
    institution: string | null;
    educationLevel: string | null;
    bio: string | null;
    skills: string[];
    interests: string[];
    updatedAt: Date;
  } | null;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrateur",
  ADMIN: "Administrateur",
  STAFF: "Personnel",
  USER: "Utilisateur",
};

/** Champs plus hauts sur mobile (zone tactile ≥ 44 px) ; texte 16 px pour éviter le zoom automatique d'iOS. */
const inputClass = "h-11 rounded-xl text-base sm:h-10 sm:text-sm";

type Tab = "details" | "infos";

type Props = {
  initialProfile: ProfileData;
};

export function ProfilePageView({ initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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

  const updateField = (field: keyof typeof form, value: string) =>
    setForm(current => ({ ...current, [field]: value }));

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Non disponible";
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleProfileSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const payload: ProfileInput = {
          ...form,
          skills: splitList(form.skills),
          interests: splitList(form.interests),
        };
        const updated = await updateCurrentProfileAction(payload);
        setProfile(updated as ProfileData);
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

  const handlePasswordSubmit = (event: React.FormEvent) => {
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
        setShowPasswordDialog(false);
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

  const displayName =
    profile.name ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    "Nom non défini";

  return (
    <div className="overflow-clip rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Bannière : photo, identité et statut */}
      <div
        className="relative bg-cover bg-center"
        style={{ backgroundImage: "url(/niamey.jpg)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${charter.ink}b3, ${charter.orangeDark}cc)`,
          }}
        />

        <div className="relative px-4 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-white/70 sm:text-left">
            Mon profil
          </p>

          <div className="mt-4 flex flex-col items-center gap-4 text-center sm:mt-6 sm:flex-row sm:items-center sm:gap-6 sm:text-left">
            <div className="relative shrink-0">
              <Image
                className="h-24 w-24 rounded-full object-cover shadow-2xl ring-4 ring-white sm:h-32 sm:w-32 sm:ring-[6px]"
                src={profile.image || "/avatar/default-avatar.jpg"}
                alt={displayName}
                width={128}
                height={128}
                unoptimized
              />
              <button
                type="button"
                onClick={() => setShowAvatarDialog(true)}
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white transition-transform active:scale-95 sm:hover:scale-110"
                style={{ backgroundColor: charter.orange }}
                aria-label="Modifier ma photo de profil"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            <div className="min-w-0 flex-1 text-white">
              <h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl">
                {displayName}
              </h1>
              {(profile.firstName || profile.lastName) && (
                <p className="mt-1 break-words text-base text-white/90 sm:text-xl">
                  {profile.firstName} {profile.lastName}
                </p>
              )}
              <p className="mt-1.5 break-all text-sm text-white/80 sm:mt-2 sm:text-base">
                {profile.email}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-4 sm:justify-start">
                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm">
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm ${
                    profile.isActive
                      ? "border-green-300/50 bg-green-500/20 text-white"
                      : "border-red-300/50 bg-red-500/20 text-white"
                  }`}
                >
                  <span
                    className={`mr-2 h-2 w-2 rounded-full ${
                      profile.isActive ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  {profile.isActive ? "Compte actif" : "Compte inactif"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets : pleine largeur sur mobile, faciles à toucher */}
      <div className="border-b border-gray-200">
        <div className="flex" role="tablist">
          <TabButton
            active={activeTab === "details"}
            onClick={() => setActiveTab("details")}
            label="Compte"
            longLabel="Détails du compte"
          />
          <TabButton
            active={activeTab === "infos"}
            onClick={() => setActiveTab("infos")}
            label="Infos perso"
            longLabel="Informations personnelles"
          />
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mx-4 mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 sm:mx-8 sm:mt-6"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-8 sm:mt-6"
        >
          {error}
        </p>
      )}

      {activeTab === "details" && (
        <div className="p-4 sm:p-8">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <DetailItem label="Prénom" value={profile.firstName} />
            <DetailItem label="Nom" value={profile.lastName} />
            <DetailItem label="Email" value={profile.email} breakAll />
            <DetailItem
              label="Rôle"
              value={ROLE_LABELS[profile.role] ?? profile.role}
            />
            <DetailItem
              label="Email vérifié"
              value={profile.emailVerified ? "Oui" : "Non"}
            />
            <DetailItem
              label="Double authentification"
              value={profile.isTwoFactorEnabled ? "Activée" : "Désactivée"}
            />
            <DetailItem
              label="Dernière mise à jour"
              value={formatDate(profile.profile?.updatedAt)}
            />
          </dl>

          <div className="mt-6 border-t border-gray-200 pt-6 sm:mt-8">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:h-9 sm:w-auto"
              onClick={() => setShowPasswordDialog(true)}
            >
              Modifier le mot de passe
            </Button>
          </div>
        </div>
      )}

      {activeTab === "infos" && (
        <form onSubmit={handleProfileSubmit}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:gap-6 sm:p-8 md:grid-cols-2">
            {profile.nameLocked && (
              <div className="space-y-3 md:col-span-2">
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                  Votre nom est celui de votre candidature ambassadeur : il figure sur vos documents officiels (attestations,
                  engagement, badge) et ne peut pas être modifié directement. En cas d&apos;erreur, envoyez une demande de
                  correction : un administrateur l&apos;examinera.
                </p>
                <NameChangeRequestForm />
              </div>
            )}
            <FormField label="Nom complet">
              <Input
                className={inputClass}
                value={form.name}
                onChange={e => updateField("name", e.target.value)}
                autoComplete="name"
                required
                disabled={profile.nameLocked}
              />
            </FormField>
            <FormField label="Prénom">
              <Input
                className={inputClass}
                value={form.firstName}
                onChange={e => updateField("firstName", e.target.value)}
                autoComplete="given-name"
                disabled={profile.nameLocked}
              />
            </FormField>
            <FormField label="Nom">
              <Input
                className={inputClass}
                value={form.lastName}
                onChange={e => updateField("lastName", e.target.value)}
                autoComplete="family-name"
                disabled={profile.nameLocked}
              />
            </FormField>
            <FormField label="Ville">
              <Input
                className={inputClass}
                value={form.city}
                onChange={e => updateField("city", e.target.value)}
                placeholder="Ex: Niamey, Niger"
                autoComplete="address-level2"
              />
            </FormField>
            <FormField label="Institution">
              <Input
                className={inputClass}
                value={form.institution}
                onChange={e => updateField("institution", e.target.value)}
                autoComplete="organization"
              />
            </FormField>
            <FormField label="Niveau d'étude">
              <Input
                className={inputClass}
                value={form.educationLevel}
                onChange={e => updateField("educationLevel", e.target.value)}
              />
            </FormField>
            <FormField label="Compétences" hint="Séparées par des virgules">
              <Input
                className={inputClass}
                value={form.skills}
                onChange={e => updateField("skills", e.target.value)}
                placeholder="Ex: Gestion, Communication"
              />
            </FormField>
            <FormField label="Centres d'intérêt" hint="Séparés par des virgules">
              <Input
                className={inputClass}
                value={form.interests}
                onChange={e => updateField("interests", e.target.value)}
                placeholder="Ex: Leadership, Innovation"
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Biographie">
                <Textarea
                  className="min-h-32 rounded-xl text-base sm:min-h-28 sm:text-sm"
                  value={form.bio}
                  onChange={e => updateField("bio", e.target.value)}
                  placeholder="Quelques mots sur vous..."
                />
              </FormField>
            </div>
          </div>

          {/* Barre d'enregistrement : toujours visible en bas de l'écran sur mobile */}
          <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:px-8 sm:pb-8 sm:pt-0 sm:backdrop-blur-none">
            <div className="flex sm:justify-end">
              <Button
                type="submit"
                loading={isPending}
                className="h-11 w-full px-6 text-sm font-semibold text-white shadow sm:h-10 sm:w-auto"
                style={{ backgroundColor: charter.orange }}
              >
                {isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </form>
      )}

      <AvatarPicker
        open={showAvatarDialog}
        onOpenChange={setShowAvatarDialog}
        currentImage={profile.image}
        onChanged={image => {
          setProfile(current => ({ ...current, image }));
          router.refresh();
        }}
      />

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le mot de passe</DialogTitle>
            <DialogDescription>
              Utilisez un mot de passe unique d&apos;au moins 8 caractères.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <FormField label="Mot de passe actuel">
              <Input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={password.currentPassword}
                onChange={e =>
                  setPassword(current => ({
                    ...current,
                    currentPassword: e.target.value,
                  }))
                }
                required
              />
            </FormField>
            <FormField label="Nouveau mot de passe">
              <Input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={password.newPassword}
                onChange={e =>
                  setPassword(current => ({
                    ...current,
                    newPassword: e.target.value,
                  }))
                }
                required
              />
            </FormField>
            <FormField label="Confirmer le nouveau mot de passe">
              <Input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={password.confirmPassword}
                onChange={e =>
                  setPassword(current => ({
                    ...current,
                    confirmPassword: e.target.value,
                  }))
                }
                required
              />
            </FormField>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="cancel"
                className="h-11 sm:h-8"
                onClick={() => setShowPasswordDialog(false)}
              >
                Annuler
              </Button>
              <Button type="submit" loading={isPending} className="h-11 sm:h-8">
                {isPending ? "Modification..." : "Confirmer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  longLabel,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  longLabel: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex-1 border-b-2 px-3 py-3.5 text-center text-sm font-semibold transition-colors sm:flex-none sm:px-6"
      style={{
        color: active ? charter.orange : charter.inkSoft,
        borderColor: active ? charter.orange : "transparent",
      }}
    >
      <span className="sm:hidden">{label}</span>
      <span className="hidden sm:inline">{longLabel}</span>
    </button>
  );
}

function DetailItem({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string | null | undefined;
  breakAll?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1 rounded-xl bg-gray-50 p-4 sm:space-y-2 sm:bg-transparent sm:p-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:text-sm sm:text-gray-600">
        {label}
      </dt>
      <dd
        className={`text-base font-medium text-gray-900 sm:text-lg ${
          breakAll ? "break-all" : "break-words"
        }`}
      >
        {value || "Non défini"}
      </dd>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
        {hint && (
          <span className="ml-2 text-xs font-normal text-gray-500">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}
