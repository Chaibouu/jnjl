import Link from "next/link";
import {
  AlertTriangle,
  Cake,
  Calendar,
  GraduationCap,
  HeartPulse,
  Mail,
  MapPin,
  Milestone,
  Phone,
  ShieldCheck,
  Trophy,
  User,
  UserCheck,
  Wallet,
} from "lucide-react";
import { getAmbassadorApplicationAction } from "@/actions/ambassador-application-actions";
import { getPaymentStatusAction } from "@/actions/payment-actions";
import { formatGender } from "@/lib/gender";

const STATUS_LABEL: Record<string, string> = {
  SOUMIS: "Soumise",
  EN_COURS_ANALYSE: "En analyse",
  RETENU: "Acceptée",
  NON_RETENU: "Rejetée",
  LISTE_ATTENTE: "Liste d’attente",
};

const STATUS_CLASS: Record<string, string> = {
  SOUMIS: "bg-blue-100 text-blue-700",
  EN_COURS_ANALYSE: "bg-amber-100 text-amber-700",
  RETENU: "bg-green-100 text-green-700",
  NON_RETENU: "bg-red-100 text-red-700",
  LISTE_ATTENTE: "bg-purple-100 text-purple-700",
};

const STAGE_LABEL: Record<string, string> = {
  CANDIDATURE: "Candidature",
  PAIEMENT: "Paiement",
  FORMATION: "Formation",
  QCM: "QCM",
  CLASSEMENT: "Classement",
  SELECTION: "Sélection",
  REPECHAGE: "Repêchage",
  DOCUMENTS: "Documents",
  ENGAGEMENT: "Engagement",
  BADGE: "Badge",
  EMBARQUEMENT: "Embarquement",
  PRESENCE: "Présence",
  ATTESTATION: "Attestation",
};

export default async function AmbassadorApplicationDetailsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = await getAmbassadorApplicationAction(applicationId);
  const payment =
    application.status === "RETENU"
      ? await getPaymentStatusAction(applicationId)
      : null;

  const initials = `${application.firstName[0] ?? ""}${application.lastName[0] ?? ""}`.toUpperCase();

  return (
    <section className="space-y-6">
      <Link
        href="/admin/ambassadeurs/candidatures"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Retour aux candidatures
      </Link>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                {initials || <User className="h-6 w-6" />}
              </span>
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  {application.firstName} {application.lastName}
                </h1>
                <div className="mt-1.5 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {application.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {application.phone}
                  </span>
                </div>
                <span
                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[application.status] ?? "bg-muted"}`}
                >
                  {STATUS_LABEL[application.status] ?? application.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            <InfoCategory title="Candidature">
              <InfoTile
                icon={MapPin}
                label="Région"
                value={`${application.region.name} (${application.region.code})`}
              />
              <InfoTile
                icon={Calendar}
                label="Édition"
                value={`${application.edition.name} (${application.edition.year})`}
              />
            </InfoCategory>

            <InfoCategory title="Informations personnelles">
              <InfoTile
                icon={User}
                label="Sexe"
                value={formatGender(application.gender)}
              />
              <InfoTile
                icon={Cake}
                label="Date de naissance"
                value={
                  application.birthDate
                    ? new Date(application.birthDate).toLocaleDateString("fr-FR")
                    : "—"
                }
              />
              <InfoTile
                icon={MapPin}
                label="Lieu de naissance"
                value={application.birthPlace ?? "—"}
              />
              <InfoTile
                icon={GraduationCap}
                label="Niveau académique"
                value={application.educationLevel ?? "—"}
              />
              <InfoTile
                icon={HeartPulse}
                label="Handicap"
                value={
                  application.hasDisability
                    ? application.disabilityDetails || "Oui"
                    : "Non"
                }
              />
            </InfoCategory>

            <InfoCategory title="Compte utilisateur">
              <InfoTile
                icon={UserCheck}
                label="Compte"
                value={
                  application.user
                    ? application.user.isActive
                      ? "Actif"
                      : "Désactivé"
                    : "Pas encore créé"
                }
              />
              {application.user && (
                <InfoTile
                  icon={ShieldCheck}
                  label="Sécurité du compte"
                  value={`${application.user.emailVerified ? "Email vérifié" : "Email non vérifié"} · ${application.user.isTwoFactorEnabled ? "2FA activée" : "2FA non activée"}`}
                />
              )}
            </InfoCategory>

            <InfoCategory title="Parcours ambassadeur">
              <InfoTile
                icon={Milestone}
                label="Étape du parcours"
                value={STAGE_LABEL[application.stage] ?? application.stage}
              />
              <InfoTile
                icon={Trophy}
                label="Score QCM"
                value={
                  application.lastQuizAttempt?.percentage != null
                    ? `${application.lastQuizAttempt.percentage.toFixed(0)}% — ${application.lastQuizAttempt.passed ? "Admis" : "Non admis"}`
                    : application.quizScore != null
                      ? `${application.quizScore}%`
                      : "Pas encore passé"
                }
              />
            </InfoCategory>
          </div>

          {application.rejectionReason && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">
                <strong>Motif du rejet :</strong> {application.rejectionReason}
              </p>
            </div>
          )}

          {application.status === "RETENU" && (
            <div className="mt-6 rounded-xl border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Paiement des frais d’inscription
              </div>
              {payment ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {payment.amount.toLocaleString("fr-FR")} FCFA
                    </span>{" "}
                    — reçu par {payment.validatedBy?.name ?? "-"}
                    {payment.validatedAt &&
                      ` le ${new Date(payment.validatedAt).toLocaleDateString("fr-FR")}`}
                  </p>
                  <Link
                    href={`/admin/paiements/${application.id}/recu`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Voir le reçu
                  </Link>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Aucun paiement enregistré pour le moment.
                  </p>
                  <Link
                    href="/admin/paiements"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Enregistrer un paiement →
                  </Link>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Soumise le {new Date(application.createdAt).toLocaleString("fr-FR")}
          </p>
        </div>
      </div>
    </section>
  );
}

function InfoCategory({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
