import Link from "next/link";
import { getAmbassadorApplicationAction } from "@/actions/ambassador-application-actions";
import { Button } from "@/components/ui/button";

const labels: Record<string, string> = {
  SOUMIS: "Soumise",
  EN_COURS_ANALYSE: "En analyse",
  RETENU: "Acceptée",
  NON_RETENU: "Rejetée",
  LISTE_ATTENTE: "Liste d’attente",
};

export default async function AmbassadorApplicationDetailsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = await getAmbassadorApplicationAction(applicationId);
  return (
    <section className="space-y-6">
      <Link
        href="/admin/ambassadeurs/candidatures"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Retour aux candidatures
      </Link>
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Candidature ambassadeur
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              {application.firstName} {application.lastName}
            </h1>
            <p className="mt-1 text-muted-foreground">{application.email}</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
            {labels[application.status] ?? application.status}
          </span>
        </div>
        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <Detail label="Téléphone" value={application.phone} />
          <Detail
            label="Région"
            value={`${application.region.name} (${application.region.code})`}
          />
          <Detail
            label="Édition"
            value={`${application.edition.name} (${application.edition.year})`}
          />
          <Detail label="Sexe" value={application.gender ?? "-"} />
          <Detail
            label="Date de naissance"
            value={
              application.birthDate
                ? new Date(application.birthDate).toLocaleDateString("fr-FR")
                : "-"
            }
          />
          <Detail
            label="Lieu de naissance"
            value={application.birthPlace ?? "-"}
          />
          <Detail
            label="Niveau académique"
            value={application.educationLevel ?? "-"}
          />
          <Detail
            label="Handicap"
            value={
              application.hasDisability
                ? application.disabilityDetails || "Oui"
                : "Non"
            }
          />
          <Detail
            label="Compte"
            value={application.user ? "Créé" : "Pas encore créé"}
          />
        </dl>
        {application.rejectionReason && (
          <div className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            <strong>Motif du rejet :</strong> {application.rejectionReason}
          </div>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          Soumise le {new Date(application.createdAt).toLocaleString("fr-FR")}
        </p>
      </div>
    </section>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
