import Link from "next/link";
import {
  Award,
  Calendar,
  GraduationCap,
  MapPin,
  Sparkles,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";
import type { getLeaderSpaceAction } from "@/actions/leader-actions";

const STAGE_LABEL: Record<string, string> = {
  CANDIDATURE: "Candidature",
  PAIEMENT: "Paiement",
  FORMATION: "Formation",
  QCM: "QCM",
  CLASSEMENT: "Classement",
  SELECTION: "Sélection",
  REPECHAGE: "Repêchage",
  ENGAGEMENT: "Engagement",
  BADGE: "Badge",
  EMBARQUEMENT: "Embarquement",
  PRESENCE: "Présence",
  ATTESTATION: "Attestation",
};

const STATUS_LABEL: Record<string, string> = {
  SOUMIS: "Soumise",
  EN_COURS_ANALYSE: "En analyse",
  RETENU: "Acceptée",
  NON_RETENU: "Rejetée",
  LISTE_ATTENTE: "Liste d'attente",
};

type LeaderSpaceData = Awaited<ReturnType<typeof getLeaderSpaceAction>>;

export function LeaderSpace({ data }: { data: LeaderSpaceData }) {
  const { user, profileCompletion, history, activeEdition, alreadyAppliedThisEdition } = data;
  const displayName = user.firstName || user.name || user.email || "Jeune Leader";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Mon espace Jeune Leader
        </p>
        <h1 className="mt-1 text-3xl font-bold">Bonjour, {displayName} 👋</h1>
        <p className="mt-2 text-muted-foreground">
          Bienvenue dans votre espace personnel JNJL — profil, historique et opportunités.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profil */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" style={{ color: charter.orange }} />
              Mon profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm">
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
            <ul className="space-y-2 text-sm text-muted-foreground">
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
            <Button
              nativeButton={false}
              variant="outline"
              className="mt-5 w-full rounded-none"
              render={<Link href="/profile" />}
            >
              Compléter mon profil
            </Button>
          </CardContent>
        </Card>

        {/* Historique */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" style={{ color: charter.orange }} />
              Mon historique
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Vous n'avez encore déposé aucune candidature.
                </p>
                {activeEdition && (
                  <Button
                    nativeButton={false}
                    className="mt-4 rounded-none text-white hover:opacity-90"
                    style={{ backgroundColor: charter.orange }}
                    render={<Link href="/ambassadeurs/candidature" />}
                  >
                    Devenir Ambassadeur
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {history.map(application => (
                  <li
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                  >
                    <div>
                      <p className="font-medium">
                        Candidature Ambassadeur — {application.edition.name} ({application.edition.year})
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Région : {application.region.name} · Soumise le{" "}
                        {new Date(application.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {STATUS_LABEL[application.status] ?? application.status}
                      </span>
                      {application.status === "RETENU" && (
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                          style={{ backgroundColor: charter.orange }}
                        >
                          Étape : {STAGE_LABEL[application.stage] ?? application.stage}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Opportunités */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" style={{ color: charter.orange }} />
            Opportunités
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeEdition ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <OpportunityCard
                title="Devenir Ambassadeur"
                description={`Représentez votre région pour ${activeEdition.name}.`}
                href={alreadyAppliedThisEdition ? undefined : "/ambassadeurs/candidature"}
                disabledLabel={alreadyAppliedThisEdition ? "Déjà candidat cette édition" : undefined}
              />
              <OpportunityCard
                title="Voir le programme"
                description="Consultez les activités de l'édition en cours."
                href="/programme"
              />
              <OpportunityCard
                title="Actualités"
                description="Suivez les dernières actualités de la JNJL."
                href="/actualites"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune édition active pour le moment — revenez bientôt pour de nouvelles opportunités.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OpportunityCard({
  title,
  description,
  href,
  disabledLabel,
}: {
  title: string;
  description: string;
  href?: string;
  disabledLabel?: string;
}) {
  const content = (
    <>
      <p className="font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-sm font-semibold" style={{ color: href ? charter.orange : undefined }}>
        {href ? "Découvrir →" : disabledLabel}
      </p>
    </>
  );

  if (!href) {
    return <div className="rounded-xl border p-5 opacity-60">{content}</div>;
  }

  return (
    <Link href={href} className="block rounded-xl border p-5 transition-shadow hover:shadow-md">
      {content}
    </Link>
  );
}
