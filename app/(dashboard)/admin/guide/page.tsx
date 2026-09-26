import {
  Award,
  BadgeCheck,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GraduationCap,
  ListOrdered,
  LogIn,
  Plane,
  ScrollText,
  ShieldCheck,
  Trophy,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { getUser } from "@/actions/getUser";
import { db } from "@/lib/db";
import charter from "@/settings/charter";

type Role = "public" | "admin" | "staff" | "ambassador";

const ROLE_LABEL: Record<Role, string> = {
  public: "Le candidat",
  admin: "Admin",
  staff: "Staff régional",
  ambassador: "Ambassadeur",
};

const ROLE_COLOR: Record<Role, string> = {
  public: charter.inkFaint,
  admin: charter.orange,
  staff: charter.green,
  ambassador: charter.gold,
};

const STEPS: { n: string; title: string; role: Role; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { n: "1", title: "Candidature", role: "public", icon: Users, desc: "Le candidat dépose sa candidature en ligne (identité, région) sur le site public." },
  { n: "2", title: "Acceptation", role: "admin", icon: UserCheck, desc: "L'admin accepte ou rejette la candidature. Accepter crée le compte utilisateur et l'envoie vers Paiement." },
  { n: "3", title: "Paiement", role: "staff", icon: Wallet, desc: "Le staff de la région encaisse les frais d'inscription (5 000 FCFA, en espèces) et enregistre le paiement." },
  { n: "4", title: "Formation", role: "ambassador", icon: GraduationCap, desc: "L'ambassadeur suit en ligne les modules de formation obligatoires jusqu'à les terminer tous." },
  { n: "5", title: "QCM", role: "ambassador", icon: FileCheck2, desc: "Il passe ensuite le QCM de classement, dont le score alimente le classement régional." },
  { n: "6", title: "Classement", role: "admin", icon: ListOrdered, desc: "L'admin calcule le classement régional à partir des scores QCM des candidats retenus." },
  { n: "7", title: "Sélection", role: "admin", icon: Trophy, desc: "L'admin lance la sélection : dans chaque région, les mieux classés dans la limite du quota sont sélectionnés." },
  { n: "8", title: "Repêchage", role: "admin", icon: ShieldCheck, desc: "Pour un non-sélectionné, l'admin peut valider un repêchage exceptionnel (justification obligatoire)." },
  { n: "9", title: "Engagement", role: "ambassador", icon: ScrollText, desc: "Une fois sélectionné, l'ambassadeur lit et signe en ligne sa fiche d'engagement officielle." },
  { n: "10", title: "Badge", role: "admin", icon: BadgeCheck, desc: "L'admin attribue le badge officiel (numéro unique + QR code) une fois l'engagement signé." },
  { n: "11", title: "Embarquement", role: "staff", icon: Plane, desc: "Le staff de la région valide l'embarquement de ses ambassadeurs badgés le jour du départ." },
  { n: "12", title: "Présence", role: "staff", icon: ClipboardCheck, desc: "À l'événement, le staff pointe la présence en scannant ou saisissant le numéro de badge." },
  { n: "13", title: "Attestation", role: "admin", icon: FileText, desc: "L'admin génère l'attestation officielle de participation pour chaque ambassadeur pointé présent." },
];

const ROLE_CARDS: {
  color: string;
  title: string;
  summary: string;
  responsibilities: string[];
  pages: { label: string; href: string }[];
}[] = [
  {
    color: charter.orange,
    title: "Admin",
    summary:
      "Pilote le parcours ambassadeur de bout en bout et gère les contenus du site (actualités, programme, partenaires...).",
    responsibilities: [
      "Accepter/rejeter les candidatures",
      "Calculer le classement et lancer la sélection",
      "Valider les repêchages",
      "Rédiger la fiche d'engagement",
      "Attribuer les badges",
      "Générer les attestations",
      "Régler quotas, dates et textes des documents (Paramètres)",
    ],
    pages: [
      { label: "Candidatures", href: "/admin/ambassadeurs/candidatures" },
      { label: "Classement & Sélection", href: "/admin/selection" },
      { label: "Repêchage", href: "/admin/repechage" },
      { label: "Badges", href: "/admin/badges" },
      { label: "Attestations", href: "/admin/attestations" },
      { label: "Paramètres", href: "/admin/parametres" },
    ],
  },
  {
    color: charter.green,
    title: "Staff régional (point focal)",
    summary:
      "Gère le terrain dans SA région uniquement — les autres régions ne sont pas visibles depuis son compte.",
    responsibilities: [
      "Encaisser les paiements d'inscription",
      "Valider les embarquements le jour du départ",
      "Pointer la présence à l'événement",
    ],
    pages: [
      { label: "Paiements", href: "/admin/paiements" },
      { label: "Embarquement", href: "/admin/embarquement" },
      { label: "Présence", href: "/admin/presence" },
    ],
  },
  {
    color: charter.tertiary,
    title: "Super Admin",
    summary:
      "Accès total à toute la plateforme, sans restriction de permission. Généralement pas d'action quotidienne sur le parcours : supervise l'ensemble et gère les comptes internes.",
    responsibilities: [
      "Créer et gérer les comptes admin/staff",
      "Attribuer les permissions fines",
      "Superviser l'ensemble du parcours et des statistiques",
    ],
    pages: [
      { label: "Utilisateurs", href: "/admin/users" },
      { label: "Statistiques", href: "/admin/statistiques" },
    ],
  },
];

export default async function AdminGuidePage() {
  const result = await getUser();
  const sessionUser = result?.user?.user;

  let focalRegionName: string | null = null;
  if (sessionUser?.id) {
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { focalRegion: { select: { name: true } } },
    });
    focalRegionName = user?.focalRegion?.name ?? null;
  }

  const roleLabel =
    sessionUser?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : sessionUser?.role === "ADMIN"
        ? "Admin"
        : sessionUser?.role === "STAFF"
          ? "Staff régional"
          : null;

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Prise en main
        </p>
        <h1 className="mt-1 text-3xl font-bold">Guide du parcours ambassadeur</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Ce guide résume les 13 étapes du parcours d&apos;un ambassadeur JNJL et qui intervient à chaque étape,
          pour vous permettre de prendre en main la plateforme rapidement.
        </p>
        {roleLabel && (
          <div
            className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: charter.orange }}
          >
            <LogIn className="h-4 w-4" />
            Vous êtes connecté en tant que {roleLabel}
            {focalRegionName ? ` — région ${focalRegionName}` : ""}
          </div>
        )}
      </div>

      {/* Timeline des 13 étapes */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">Le parcours en 13 étapes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque étiquette de couleur indique qui déclenche le passage à l&apos;étape suivante.
        </p>
        <div className="mt-6 space-y-0">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === STEPS.length - 1;
            return (
              <div key={step.n} className="relative flex gap-4 pb-8 last:pb-0">
                {!isLast && (
                  <span
                    className="absolute left-[19px] top-10 h-full w-px"
                    style={{ backgroundColor: charter.border }}
                    aria-hidden
                  />
                )}
                <div
                  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: ROLE_COLOR[step.role] }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Étape {step.n}</span>
                    <h3 className="font-semibold">{step.title}</h3>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: ROLE_COLOR[step.role] }}
                    >
                      {ROLE_LABEL[step.role]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Qui fait quoi */}
      <div className="grid gap-6 lg:grid-cols-3">
        {ROLE_CARDS.map(card => (
          <div key={card.title} className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: card.color }} aria-hidden />
              <h3 className="text-lg font-bold">{card.title}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{card.summary}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {card.responsibilities.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
              {card.pages.map(page => (
                <a
                  key={page.href}
                  href={page.href}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/50"
                >
                  {page.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
