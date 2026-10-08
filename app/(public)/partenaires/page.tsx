import Link from "next/link";
import { ArrowRight, Handshake } from "lucide-react";
import { listActiveEditionPartnersAction } from "@/actions/partner-actions";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
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

// Une couleur de la charte par catégorie, reprise sur la pastille et le liseré des cartes.
const CATEGORY_COLOR: Record<string, string> = {
  INSTITUTIONNEL: charter.orange,
  TECHNIQUE: charter.green,
  FINANCIER: "#B58500",
  MEDIA: charter.ink,
  AUTRE: "#6b7280",
};

export default async function PartnersPage() {
  const partners = await listActiveEditionPartnersAction();

  const grouped = CATEGORY_ORDER.map(category => ({
    category,
    items: partners.filter(partner => partner.category === category),
  })).filter(group => group.items.length > 0);

  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Partenaires"
        title="Ils soutiennent la JNJL"
        description="Institutions, entreprises et médias qui s’engagent à nos côtés pour la jeunesse nigérienne."
        image="/entetes/partenaires.jpg"
        imagePosition="50% 58%"
        tint="gold"
      >
        {partners.length > 0 && (
          <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            <Handshake className="h-4 w-4" style={{ color: charter.gold }} />
            {partners.length} partenaire{partners.length > 1 ? "s" : ""}
          </span>
        )}
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {grouped.length === 0 ? (
          <p className="rounded-2xl border bg-white p-10 text-center text-muted-foreground shadow-sm">
            Aucun partenaire renseigné pour l’édition en cours.
          </p>
        ) : (
          <div className="space-y-14">
            {grouped.map(group => {
              const color = CATEGORY_COLOR[group.category] ?? charter.orange;
              return (
                <section key={group.category}>
                  <div className="flex items-center gap-4">
                    <span
                      className="rounded-full px-4 py-1.5 text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {CATEGORY_LABEL[group.category] ?? group.category}
                    </span>
                    <span className="h-px flex-1" style={{ backgroundColor: `${color}55` }} />
                  </div>

                  <Reveal stagger={0.07} className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                    {group.items.map(partner => (
                      <a
                        key={partner.id}
                        href={partner.website ?? undefined}
                        target={partner.website ? "_blank" : undefined}
                        rel={partner.website ? "noopener noreferrer" : undefined}
                        className="group relative flex h-36 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                        style={{ borderColor: charter.border }}
                      >
                        <span
                          className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                          style={{ backgroundColor: color }}
                        />
                        {partner.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={partner.logoUrl}
                            alt={partner.name}
                            className="max-h-16 max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <span className="text-center text-sm font-bold" style={{ color: charter.ink }}>
                            {partner.name}
                          </span>
                        )}
                        {partner.logoUrl && (
                          <span className="line-clamp-1 text-center text-xs" style={{ color: charter.inkFaint }}>
                            {partner.name}
                          </span>
                        )}
                      </a>
                    ))}
                  </Reveal>
                </section>
              );
            })}
          </div>
        )}

        {/* Appel aux partenaires */}
        <Reveal className="mt-20">
          <div
            className="relative overflow-hidden rounded-3xl px-8 py-12 text-center text-white shadow-xl sm:px-14"
            style={{ background: `linear-gradient(120deg, ${charter.orange}, ${charter.orangeDark})` }}
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 motion-safe:animate-float-slow"
              aria-hidden="true"
            />
            <h2 className="relative text-2xl font-extrabold sm:text-3xl">Devenez partenaire de la JNJL</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/90">
              Associez votre structure à un événement qui rassemble la jeunesse la plus engagée du Niger.
            </p>
            <Link
              href="/#contact"
              className="group relative mt-7 inline-flex h-12 items-center gap-2 bg-white px-8 text-base font-semibold shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              style={{ color: charter.orangeDark }}
            >
              Nous contacter
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
