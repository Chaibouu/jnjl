import Link from "next/link";
import {
  ArrowRight,
  Award,
  Calendar,
  Check,
  Clock,
  GraduationCap,
  MapPin,
  Newspaper,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";
import type { getLeaderSpaceAction } from "@/actions/leader-actions";

const STATUS_LABEL: Record<string, string> = {
  SOUMIS: "Soumise",
  EN_COURS_ANALYSE: "En analyse",
  RETENU: "Acceptée",
  NON_RETENU: "Non retenue",
  LISTE_ATTENTE: "Liste d'attente",
};

/** Étapes du parcours telles que présentées à l'ambassadeur (les étapes internes sont regroupées). */
const STEPS = [
  { label: "Candidature", stages: ["CANDIDATURE"], href: undefined },
  { label: "Paiement", stages: ["PAIEMENT"], href: "/ambassadeur/paiement" },
  { label: "Formation", stages: ["FORMATION"], href: "/ambassadeur/formation" },
  { label: "QCM", stages: ["QCM"], href: "/ambassadeur/qcm" },
  { label: "Sélection", stages: ["CLASSEMENT", "SELECTION", "REPECHAGE"], href: "/ambassadeur/qcm" },
  { label: "Engagement", stages: ["ENGAGEMENT"], href: "/ambassadeur/engagement" },
  { label: "Badge", stages: ["BADGE", "EMBARQUEMENT", "PRESENCE"], href: "/ambassadeur/badge" },
  { label: "Attestation", stages: ["ATTESTATION"], href: "/ambassadeur/attestation" },
] as const;

type LeaderSpaceData = Awaited<ReturnType<typeof getLeaderSpaceAction>>;
type Application = LeaderSpaceData["history"][number];

/** Indice de l'étape en cours. Accepté mais encore au stade « Candidature » = paiement à effectuer. */
function currentStepIndex(application: Application) {
  if (application.status !== "RETENU") return 0;
  const stage = application.stage === "CANDIDATURE" ? "PAIEMENT" : application.stage;
  const index = STEPS.findIndex(step => (step.stages as readonly string[]).includes(stage));
  return index === -1 ? 0 : index;
}

export function LeaderSpace({ data }: { data: LeaderSpaceData }) {
  const { user, profileCompletion, history, activeEdition, alreadyAppliedThisEdition } = data;
  const displayName = user.firstName || user.name || user.email || "Jeune Leader";
  const current = history[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Bandeau d'accueil */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm sm:p-8"
        style={{ backgroundImage: `linear-gradient(135deg, ${charter.ink} 0%, #3a3a3a 55%, ${charter.orangeDark} 140%)` }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-2xl"
          style={{ backgroundColor: charter.orange }}
        />
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.gold }}>
          Mon espace Jeune Leader
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Bonjour, {displayName} 👋</h1>
        <p className="mt-2 max-w-xl text-sm text-white/75">
          {activeEdition
            ? `Édition en cours : ${activeEdition.name} (${activeEdition.year}). Suivez votre parcours et vos prochaines étapes.`
            : "Bienvenue dans votre espace personnel JNJL — profil, historique et opportunités."}
        </p>
      </section>

      {/* Parcours */}
      {current ? <JourneyCard application={current} /> : <NoApplicationCard canApply={!!activeEdition} />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profil */}
        <Card className="gap-4 py-6 lg:col-span-1">
          <CardHeader className="px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" style={{ color: charter.orange }} />
              Mon profil
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="text-muted-foreground">Complétude</span>
                <span className="font-semibold">{profileCompletion}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${profileCompletion}%`, backgroundColor: charter.orange }}
                />
              </div>
            </div>
            <ul className="space-y-2 p-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {user.profile?.region?.name ?? "Région non renseignée"}
              </li>
              <li className="flex items-center gap-2">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                {user.profile?.institution ?? "Établissement non renseigné"}
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Membre depuis {new Date(user.memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </li>
            </ul>
            <Button nativeButton={false} variant="outline" className="mt-5 w-full rounded-none" render={<Link href="/profile" />}>
              {profileCompletion < 100 ? "Compléter mon profil" : "Voir mon profil"}
            </Button>
          </CardContent>
        </Card>

        {/* Historique */}
        <Card className="gap-4 py-6 lg:col-span-2">
          <CardHeader className="px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" style={{ color: charter.orange }} />
              Mon historique
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            {history.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Vous n&apos;avez encore déposé aucune candidature.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map(application => (
                  <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        Candidature Ambassadeur — {application.edition.name} ({application.edition.year})
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Région : {application.region.name} · Soumise le{" "}
                        {new Date(application.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <StatusPill status={application.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Opportunités */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4" style={{ color: charter.orange }} />
          Opportunités
        </h2>
        {activeEdition ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <OpportunityCard
              icon={<Award className="h-5 w-5" />}
              title="Devenir Ambassadeur"
              description={`Représentez votre région pour ${activeEdition.name}.`}
              href={alreadyAppliedThisEdition ? undefined : "/ambassadeurs/candidature"}
              disabledLabel={alreadyAppliedThisEdition ? "Déjà candidat cette édition" : undefined}
            />
            <OpportunityCard
              icon={<Calendar className="h-5 w-5" />}
              title="Voir le programme"
              description="Consultez les activités de l'édition en cours."
              href="/programme"
            />
            <OpportunityCard
              icon={<Newspaper className="h-5 w-5" />}
              title="Actualités"
              description="Suivez les dernières actualités de la JNJL."
              href="/actualites"
            />
          </div>
        ) : (
          <p className="rounded-xl border p-5 text-sm text-muted-foreground">
            Aucune édition active pour le moment — revenez bientôt pour de nouvelles opportunités.
          </p>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "RETENU"
      ? "bg-green-100 text-green-700"
      : status === "NON_RETENU"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{STATUS_LABEL[status] ?? status}</span>
  );
}

function NoApplicationCard({ canApply }: { canApply: boolean }) {
  return (
    <Card className="gap-4 py-6">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: charter.orange }}
        >
          <Award className="h-6 w-6" />
        </span>
        <h2 className="text-lg font-bold">Devenez Ambassadeur de la JNJL</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Vous n&apos;avez pas encore déposé de candidature. Rejoignez le parcours et représentez votre région.
        </p>
        {canApply && (
          <Button
            nativeButton={false}
            className="rounded-none text-white hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
            render={<Link href="/ambassadeurs/candidature" />}
          >
            Déposer ma candidature
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function JourneyCard({ application }: { application: Application }) {
  const rejected = application.status === "NON_RETENU";
  const accepted = application.status === "RETENU";
  const index = currentStepIndex(application);
  const step = STEPS[index];

  const message = rejected
    ? "Votre candidature n'a pas été retenue pour cette édition. Merci pour votre engagement."
    : !accepted
      ? "Votre candidature est en cours d'examen par l'équipe de la JNJL. Vous serez averti par e-mail dès la décision."
      : index === 1
        ? "Votre candidature est acceptée ! Réglez vos frais d'inscription pour débloquer la suite du parcours."
        : `Étape en cours : ${step.label}.`;

  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6 flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Mon parcours ambassadeur</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {application.edition.name} ({application.edition.year})
          </p>
        </div>
        <StatusPill status={application.status} />
      </CardHeader>
      <CardContent className="space-y-6 px-6">
        {/* Étapes : défilement horizontal sur mobile */}
        <ol className="-mx-2 flex overflow-x-auto px-2 pb-2">
          {STEPS.map((item, position) => {
            const done = position < index;
            const isCurrent = position === index && !rejected;
            return (
              <li key={item.label} className="flex min-w-[84px] flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={`h-0.5 flex-1 ${position === 0 ? "opacity-0" : ""}`} style={{ backgroundColor: done || isCurrent ? charter.orange : charter.border }} />
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
                    style={{
                      borderColor: done || isCurrent ? charter.orange : charter.border,
                      backgroundColor: done ? charter.orange : isCurrent ? "#fff" : "transparent",
                      color: done ? "#fff" : isCurrent ? charter.orange : charter.inkFaint,
                      boxShadow: isCurrent ? `0 0 0 4px ${charter.orange}26` : undefined,
                    }}
                  >
                    {done ? <Check className="h-4 w-4" /> : position + 1}
                  </span>
                  <span
                    className={`h-0.5 flex-1 ${position === STEPS.length - 1 ? "opacity-0" : ""}`}
                    style={{ backgroundColor: done ? charter.orange : charter.border }}
                  />
                </div>
                <span className={`mt-2 text-xs ${isCurrent ? "font-semibold" : "text-muted-foreground"}`}>{item.label}</span>
              </li>
            );
          })}
        </ol>

        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
          style={{ backgroundColor: rejected ? "#fef2f2" : `${charter.orange}12` }}
        >
          <p className="flex items-start gap-2 text-sm">
            {rejected ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: charter.orange }} />
            )}
            {message}
          </p>
          {accepted && step.href && (
            <Button
              nativeButton={false}
              className="rounded-none text-white hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
              render={<Link href={step.href} />}
            >
              {index === 1 ? "Payer mes frais" : "Continuer"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityCard({
  icon,
  title,
  description,
  href,
  disabledLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  disabledLabel?: string;
}) {
  const content = (
    <>
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${charter.orange}18`, color: charter.orange }}
      >
        {icon}
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-sm font-semibold" style={{ color: href ? charter.orange : undefined }}>
        {href ? "Découvrir →" : disabledLabel}
      </p>
    </>
  );

  if (!href) return <div className="rounded-xl border bg-card p-5 opacity-60">{content}</div>;

  return (
    <Link href={href} className="block rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      {content}
    </Link>
  );
}
