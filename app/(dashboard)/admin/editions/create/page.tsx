import Link from "next/link";
import { EditionForm } from "@/components/admin/EditionForm";

export default function CreateEditionPage() {
  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/admin/editions"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour aux éditions
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Ajouter une édition</h1>
        <p className="mt-2 text-muted-foreground">
          Elle sera créée en brouillon — activez-la depuis sa fiche quand elle
          est prête.
        </p>
      </div>
      <EditionForm />
    </section>
  );
}
