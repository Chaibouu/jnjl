import { Clock, FileQuestion, FileText } from "lucide-react";
import { getMyCertificateAction } from "@/actions/certificate-actions";
import { PdfPreviewDialog } from "@/components/ambassador/PdfPreviewDialog";
import charter from "@/settings/charter";

export default async function MyCertificatePage() {
  const data = await getMyCertificateAction();

  if (!data) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Aucune attestation</h1>
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
        <h1 className="mt-1 text-2xl font-bold">Mon attestation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre attestation de participation à la {data.editionName}.
        </p>
      </div>

      {data.certificate ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileText className="h-10 w-10" style={{ color: charter.orange }} />
          <h2 className="text-lg font-bold">Attestation disponible</h2>
          <p className="text-sm text-muted-foreground">
            Délivrée le {new Date(data.certificate.generatedAt).toLocaleDateString("fr-FR")}.
          </p>
          <PdfPreviewDialog
            fileUrl={data.certificate.fileUrl}
            title="Mon attestation de participation"
            buttonLabel="Prévisualiser mon attestation"
          />
          <a
            href={data.certificate.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
            style={{ color: charter.orange }}
          >
            <FileText className="h-4 w-4" />
            Télécharger mon attestation
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-bold">Pas encore disponible</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {data.stage === "ATTESTATION"
              ? "Votre présence est enregistrée. L'administration va générer votre attestation très prochainement."
              : "L'attestation est délivrée après votre participation à l'événement."}
          </p>
        </div>
      )}

      {data.trainingCertificates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Attestations de formation</h2>
          {data.trainingCertificates.map(item => (
            <div
              key={item.fileUrl}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div>
                <p className="font-medium">{item.courseTitle}</p>
                <p className="text-xs text-muted-foreground">
                  Délivrée le {new Date(item.generatedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <PdfPreviewDialog
                  fileUrl={item.fileUrl}
                  title={`Attestation de formation — ${item.courseTitle}`}
                  buttonLabel="Aperçu"
                  buttonVariant="outline"
                  size="sm"
                />
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
                  style={{ color: charter.orange }}
                >
                  <FileText className="h-4 w-4" />
                  Télécharger
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
