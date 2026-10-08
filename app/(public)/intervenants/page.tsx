import { Building2, Mic } from "lucide-react";
import { listActiveEditionSpeakersAction } from "@/actions/speaker-actions";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import charter from "@/settings/charter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Intervenants",
  description:
    "Les intervenants et personnalités de la Journée Nationale du Jeune Leader (JNJL) : experts, leaders et acteurs engagés pour la jeunesse du Niger.",
  path: "/intervenants",
});

// Une couleur de la charte par carte, en alternance : la grille reste vivante sans être criarde.
const ACCENTS = [charter.orange, charter.green, "#B58500", charter.ink] as const;

export default async function SpeakersPage() {
  const speakers = await listActiveEditionSpeakersAction();

  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Intervenants"
        title="Ceux qui font la JNJL"
        description="Experts, leaders et acteurs engagés qui partagent leur parcours avec la jeunesse nigérienne."
        image="/entetes/galerie-1.jpg"
        imagePosition="50% 60%"
        tint="orange"
      >
        {speakers.length > 0 && (
          <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            <Mic className="h-4 w-4" style={{ color: charter.gold }} />
            {speakers.length} intervenant{speakers.length > 1 ? "s" : ""}
          </span>
        )}
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        {speakers.length === 0 ? (
          <p className="rounded-2xl border bg-white p-10 text-center text-muted-foreground shadow-sm">
            Aucun intervenant annoncé pour l’édition en cours.
          </p>
        ) : (
          <Reveal stagger={0.08} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {speakers.map((speaker, index) => {
              const accent = ACCENTS[index % ACCENTS.length];
              const initials = `${speaker.firstName[0] ?? ""}${speaker.lastName[0] ?? ""}`.toUpperCase();
              return (
                <article
                  key={speaker.id}
                  className="group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                  style={{ borderColor: charter.border }}
                >
                  {/* Bandeau de couleur + photo en médaillon */}
                  <div
                    className="relative h-24"
                    style={{ background: `linear-gradient(120deg, ${accent}, ${accent}aa)` }}
                  >
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 transition-transform duration-500 group-hover:scale-125"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="-mt-14 flex justify-center">
                    <div
                      className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white text-2xl font-extrabold shadow-lg transition-transform duration-300 group-hover:scale-105"
                      style={{ color: accent, backgroundColor: `${accent}18` }}
                    >
                      {speaker.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={speaker.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>

                  <div className="px-6 pb-7 pt-4 text-center">
                    <h2 className="text-lg font-bold" style={{ color: charter.ink }}>
                      {speaker.firstName} {speaker.lastName}
                    </h2>
                    {speaker.role && (
                      <p
                        className="mx-auto mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold"
                        style={{ backgroundColor: `${accent}18`, color: accent === charter.ink ? charter.ink : accent }}
                      >
                        {speaker.role}
                      </p>
                    )}
                    {speaker.organization && (
                      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs" style={{ color: charter.inkFaint }}>
                        <Building2 className="h-3.5 w-3.5" />
                        {speaker.organization}
                      </p>
                    )}
                    {speaker.bio && (
                      <p className="mt-4 line-clamp-4 text-sm leading-relaxed" style={{ color: charter.inkSoft }}>
                        {speaker.bio}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </Reveal>
        )}
      </div>
    </div>
  );
}
