import { listActiveEditionPartnersAction } from "@/actions/partner-actions";
import charter from "@/settings/charter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Partenaires",
  description:
    "Les partenaires institutionnels et privés qui soutiennent la Journée Nationale du Jeune Leader (JNJL) et la jeunesse nigérienne.",
  path: "/partenaires",
});

const CATEGORY_LABEL: Record<string, string> = {
  INSTITUTIONNEL: "Partenaires institutionnels",
  TECHNIQUE: "Partenaires techniques",
  FINANCIER: "Partenaires financiers",
  MEDIA: "Partenaires médias",
  AUTRE: "Autres partenaires",
};

const CATEGORY_ORDER = ["INSTITUTIONNEL", "TECHNIQUE", "FINANCIER", "MEDIA", "AUTRE"];

export default async function PartnersPage() {
  const partners = await listActiveEditionPartnersAction();

  const grouped = CATEGORY_ORDER.map(category => ({
    category,
    items: partners.filter(partner => partner.category === category),
  })).filter(group => group.items.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Partenaires
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Ils soutiennent la JNJL</h1>
      </div>

      {grouped.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          Aucun partenaire renseigné pour l’édition en cours.
        </p>
      ) : (
        <div className="mt-12 space-y-12">
          {grouped.map(group => (
            <div key={group.category}>
              <h2 className="text-center text-lg font-semibold text-muted-foreground">
                {CATEGORY_LABEL[group.category] ?? group.category}
              </h2>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
                {group.items.map(partner => (
                  <a
                    key={partner.id}
                    href={partner.website ?? undefined}
                    target={partner.website ? "_blank" : undefined}
                    rel={partner.website ? "noopener noreferrer" : undefined}
                    className="flex h-24 w-40 flex-col items-center justify-center gap-2 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    {partner.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={partner.logoUrl} alt={partner.name} className="max-h-12 max-w-full object-contain" />
                    ) : (
                      <span className="text-center text-sm font-medium">{partner.name}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
