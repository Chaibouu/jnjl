import { Clock, FileQuestion, GraduationCap } from "lucide-react";
import { getMyTrainingAttestationStatusAction } from "@/actions/training-attestation-actions";
import { TrainingAttestationDownload } from "@/components/ambassador/TrainingAttestationDownload";
import charter from "@/settings/charter";

export const dynamic = "force-dynamic";

export default async function MyTrainingAttestationPage() {
  const status = await getMyTrainingAttestationStatusAction();

  if (!status) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Attestation indisponible</h1>
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
          Mes documents
        </p>
        <h1 className="mt-1 text-2xl font-bold">Attestation de formation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Attestation de votre participation à la formation des ambassadeurs, {status.editionName}.
        </p>
      </div>

      {status.available ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <GraduationCap className="h-10 w-10" style={{ color: charter.orange }} />
          <h2 className="text-lg font-bold">Attestation disponible</h2>
          <p className="text-sm text-muted-foreground">
            Votre présence à la formation a été validée
            {status.validatedAt ? ` le ${new Date(status.validatedAt).toLocaleDateString("fr-FR")}` : ""} par le staff de
            votre région.
          </p>
          <TrainingAttestationDownload />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-bold">Pas encore disponible</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Votre attestation de formation sera disponible ici dès que le staff de votre région aura marqué votre
            présence à la formation.
          </p>
        </div>
      )}
    </section>
  );
}
