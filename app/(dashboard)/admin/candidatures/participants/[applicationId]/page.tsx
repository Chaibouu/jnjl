import Link from "next/link";
import { Calendar, Mail, MapPin, MessageSquare, Phone, User, UserCheck } from "lucide-react";
import { getEventApplicationAction } from "@/actions/event-application-actions";
import { formatGender } from "@/lib/gender";

const STATUS_LABEL: Record<string, string> = {
  SOUMIS: "Soumise",
  EN_COURS_ANALYSE: "En analyse",
  RETENU: "Acceptée",
  NON_RETENU: "Rejetée",
  LISTE_ATTENTE: "Liste d'attente",
};

const STATUS_CLASS: Record<string, string> = {
  SOUMIS: "bg-blue-100 text-blue-700",
  EN_COURS_ANALYSE: "bg-amber-100 text-amber-700",
  RETENU: "bg-green-100 text-green-700",
  NON_RETENU: "bg-red-100 text-red-700",
  LISTE_ATTENTE: "bg-purple-100 text-purple-700",
};

export default async function EventApplicationDetailsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = await getEventApplicationAction(applicationId);
  const initials = `${application.firstName[0] ?? ""}${application.lastName[0] ?? ""}`.toUpperCase();

  return (
    <section className="space-y-6">
      <Link
        href="/admin/candidatures/participants"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Retour aux candidatures
      </Link>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="p-6">
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

          <div className="mt-8 space-y-8">
            <InfoCategory title="Candidature">
              <InfoTile icon={User} label="Sexe" value={formatGender(application.gender)} />
              <InfoTile
                icon={MapPin}
                label="Région"
                value={application.region ? `${application.region.name} (${application.region.code})` : "Non renseignée"}
              />
              <InfoTile
                icon={Calendar}
                label="Édition"
                value={`${application.edition.name} (${application.edition.year})`}
              />
              <InfoTile
                icon={UserCheck}
                label="Compte associé"
                value={application.user ? "Compte existant" : "Aucun compte (visiteur)"}
              />
            </InfoCategory>

            {application.motivation && (
              <InfoCategory title="Motivation">
                <div className="col-span-full flex items-start gap-3 rounded-xl border bg-muted/30 p-4 sm:col-span-2 lg:col-span-4">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm leading-relaxed">{application.motivation}</p>
                </div>
              </InfoCategory>
            )}
          </div>

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
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
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
