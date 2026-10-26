import { Users } from "lucide-react";
import { getSelectedAmbassadorsContextAction } from "@/actions/selected-ambassadors-actions";
import { SelectedAmbassadorsList } from "@/components/ambassador/SelectedAmbassadorsList";
import charter from "@/settings/charter";

export const dynamic = "force-dynamic";

export default async function SelectedAmbassadorsPage() {
  const context = await getSelectedAmbassadorsContextAction();

  if (!context) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Liste indisponible</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            La liste des ambassadeurs sélectionnés est réservée aux ambassadeurs retenus et à l&apos;équipe.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Ambassadeurs
        </p>
        <h1 className="mt-1 text-2xl font-bold">Liste des ambassadeurs sélectionnés</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {context.isAdmin
            ? "Liste finale des ambassadeurs retenus. Filtrez par région et par mode de paiement, puis téléchargez en PDF ou Excel."
            : "Liste finale des ambassadeurs retenus de votre région. Filtrez par mode de paiement, puis téléchargez en PDF ou Excel."}
        </p>
      </div>
      <SelectedAmbassadorsList isAdmin={context.isAdmin} regions={context.regions} />
    </section>
  );
}
