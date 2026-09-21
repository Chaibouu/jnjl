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
    <div className="flex h-full flex-col bg-gray-50">
      {/* En-tête titre */}
      <div
        className="flex-shrink-0 rounded-t-3xl"
        style={{
          background: `linear-gradient(to right, ${charter.ink}, ${charter.orangeDark})`,
        }}
      >
        <div className="px-8 py-8">
          <h1 className="text-3xl font-bold text-white">Mon Profil</h1>
          <p className="mt-2 text-white/80">
            Gérez vos informations personnelles
          </p>
        </div>
      </div>

      {/* Bannière photo + identité */}
      <div className="relative -mt-26 flex-shrink-0">
        <div
          className="relative h-48 bg-cover bg-center"
          style={{ backgroundImage: "url(/niamey.jpg)" }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `${charter.orange}33` }}
          />

          <div className="relative mx-auto flex h-full max-w-4xl items-end px-8 pb-8">
            <div className="flex w-full items-center space-x-6">
              <div className="relative">
                <div className="relative h-32 w-32">
                  <Image
                    className="rounded-full object-cover ring-6 ring-white shadow-2xl"
                    src={profile.image || "/avatar/default-avatar.jpg"}
                    alt={displayName}
                    width={128}
                    height={128}
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarDialog(true)}
                  className="absolute bottom-0 right-0 rounded-full p-2 text-white shadow-lg ring-4 ring-white transition-all hover:scale-110"
                  style={{ backgroundColor: charter.orange }}
                  aria-label="Modifier ma photo de profil"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 text-white">
                <h2 className="text-3xl font-bold">{displayName}</h2>
                {(profile.firstName || profile.lastName) && (
                  <p className="mt-1 text-xl text-white/90">
                    {profile.firstName} {profile.lastName}
                  </p>
                )}
                <p className="mt-2 text-base text-white/80">{profile.email}</p>
                <div className="mt-4 flex flex-wrap items-center gap-y-2 space-x-3">
                  <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold backdrop-blur-sm ${
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
      </div>

      {/* Contenu onglets */}
      <div className="modal-scroll flex-1 overflow-y-auto">
        <div className="w-full overflow-hidden rounded-b-2xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-200 px-6 pt-4">
            <div className="flex items-center gap-2">
              <TabButton
                active={activeTab === "details"}
                onClick={() => setActiveTab("details")}
                label="Détails du compte"
              />
              <TabButton
                active={activeTab === "infos"}
                onClick={() => setActiveTab("infos")}
                label="Informations personnelles"
              />
            </div>
          </div>

          {message && (
            <p className="mx-8 mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p className="mx-8 mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {activeTab === "details" && (
            <div className="p-8">
              <dl className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Prénom" value={profile.firstName} />
                <DetailItem label="Nom" value={profile.lastName} />
                <DetailItem label="Email" value={profile.email} />
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

              <div className="mt-8 border-t border-gray-200 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  Modifier le mot de passe
                </Button>
              </div>
            </div>
          )}

          {activeTab === "infos" && (
            <div className="p-8">
              <form
                onSubmit={handleProfileSubmit}
                className="grid grid-cols-1 gap-6 md:grid-cols-2"
              >
                <FormField label="Nom complet">
                  <Input
                    className="rounded-xl"
                    value={form.name}
                    onChange={e => updateField("name", e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Prénom">
                  <Input
                    className="rounded-xl"
                    value={form.firstName}
                    onChange={e => updateField("firstName", e.target.value)}
                  />
                </FormField>
                <FormField label="Nom">
                  <Input
                    className="rounded-xl"
                    value={form.lastName}
                    onChange={e => updateField("lastName", e.target.value)}
                  />
                </FormField>
                <FormField label="Ville">
                  <Input
                    className="rounded-xl"
                    value={form.city}
                    onChange={e => updateField("city", e.target.value)}
                    placeholder="Ex: Niamey, Niger"
                  />
                </FormField>
                <FormField label="Institution">
                  <Input
                    className="rounded-xl"
                    value={form.institution}
                    onChange={e => updateField("institution", e.target.value)}
                  />
                </FormField>
                <FormField label="Niveau d'étude">
                  <Input
                    className="rounded-xl"
                    value={form.educationLevel}
                    onChange={e =>
                      updateField("educationLevel", e.target.value)
                    }
                  />
                </FormField>
                <FormField label="Compétences">
                  <Input
                    className="rounded-xl"
                    value={form.skills}
                    onChange={e => updateField("skills", e.target.value)}
                    placeholder="Ex: Gestion, Communication"
                  />
                </FormField>
                <FormField label="Centres d'intérêt">
                  <Input
                    className="rounded-xl"
                    value={form.interests}
                    onChange={e => updateField("interests", e.target.value)}
                    placeholder="Ex: Leadership, Innovation"
                  />
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="Biographie">
                    <Textarea
                      className="min-h-28 rounded-xl"
                      value={form.bio}
                      onChange={e => updateField("bio", e.target.value)}
                      placeholder="Quelques mots sur vous..."
                    />
                  </FormField>
                </div>
                <div className="flex justify-end md:col-span-2">
                  <Button
                    type="submit"
                    loading={isPending}
                    className="px-6 py-3 text-sm font-semibold text-white shadow"
                    style={{ backgroundColor: charter.orange }}
                  >
                    {isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

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
                type="password"
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
                type="password"
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
                type="password"
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="cancel"
                onClick={() => setShowPasswordDialog(false)}
              >
                Annuler
              </Button>
              <Button type="submit" loading={isPending}>
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
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-b-2 px-3 py-2 text-sm font-semibold transition-colors"
      style={{
        color: active ? charter.orange : charter.inkSoft,
        borderColor: active ? charter.orange : "transparent",
      }}
    >
      {label}
    </button>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="space-y-2">
      <dt className="text-sm font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </dt>
      <dd className="text-lg font-medium text-gray-900">
        {value || "Non défini"}
      </dd>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
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
