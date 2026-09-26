import { FileQuestion } from "lucide-react";
import { getMyDocumentFormDataAction } from "@/actions/ambassador-document-actions";
import { MissionOrderSection } from "@/components/ambassador/AdministrativeDocumentsManager";
import charter from "@/settings/charter";

export default async function MyMissionOrderPage() {
  let data;
  try {
    data = await getMyDocumentFormDataAction();
  } catch (error) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Document indisponible</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Une erreur est survenue"}
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
        <h1 className="mt-1 text-2xl font-bold">Ordre de mission</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Document officiel de mission, généré à partir du modèle officiel de la JNJL.
        </p>
      </div>
      <MissionOrderSection initialData={data} />
    </section>
  );
}
