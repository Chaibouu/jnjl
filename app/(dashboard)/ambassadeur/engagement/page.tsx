import { CheckCircle2, FileQuestion, FileText } from "lucide-react";
import { getMyEngagementAction } from "@/actions/engagement-actions";
import { EngagementSignForm } from "@/components/ambassador/EngagementSignForm";
import { SignedEngagementPreview } from "@/components/ambassador/EngagementPreview";
import charter from "@/settings/charter";

export default async function MyEngagementPage() {
  const data = await getMyEngagementAction();

  if (!data) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Aucune fiche d&apos;engagement</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucune candidature ambassadeur active n&apos;a été trouvée pour votre compte.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Parcours ambassadeur
        </p>
        <h1 className="mt-1 text-2xl font-bold">Mon engagement</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lisez et acceptez la fiche d&apos;engagement pour recevoir votre badge.
        </p>
      </div>

      {data.engagement ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <CheckCircle2 className="h-10 w-10" style={{ color: charter.orange }} />
          <h2 className="text-lg font-bold">Déjà signé</h2>
          <p className="text-sm text-muted-foreground">
            Signé par {data.engagement.signatureName} le{" "}
            {new Date(data.engagement.acceptedAt).toLocaleDateString("fr-FR")}.
          </p>
          <SignedEngagementPreview fileUrl={data.engagement.fileUrl} />
          <a
            href={data.engagement.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
            style={{ color: charter.orange }}
          >
            <FileText className="h-4 w-4" />
            Télécharger ma fiche signée
          </a>
        </div>
      ) : data.stage !== "ENGAGEMENT" ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            Cette étape n&apos;est pas encore accessible pour votre candidature.
          </p>
        </div>
      ) : !data.engagementText ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            La fiche d&apos;engagement n&apos;a pas encore été publiée par l&apos;administration. Revenez bientôt.
          </p>
        </div>
      ) : (
        <EngagementSignForm
          engagementText={data.engagementText}
          editionName={data.editionName}
          ambassadorName={data.fullName}
          region={data.region}
        />
      )}
    </section>
  );
}
