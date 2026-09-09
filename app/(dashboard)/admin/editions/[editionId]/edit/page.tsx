import Link from "next/link";
import { getEditionAction } from "@/actions/edition-actions";
import { EditionForm } from "@/components/admin/EditionForm";

export default async function EditEditionPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = await params;
  const edition = await getEditionAction(editionId);

  return (
    <section className="space-y-6">
      <div>
        <Link
          href={`/admin/editions/${edition.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour à la fiche
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Modifier l’édition</h1>
      </div>
      <EditionForm edition={edition} />
    </section>
  );
}
