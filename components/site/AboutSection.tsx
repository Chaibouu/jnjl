import { Compass, HeartHandshake, Rocket, Target } from "lucide-react";
import { SectionHeader } from "@/components/site/SectionHeader";
import { Reveal } from "@/components/site/Reveal";
import charter from "@/settings/charter";

// Une couleur de la charte par pilier : la section reste vivante sans quitter l'identité JNJL.
const PILLAR_COLORS = [charter.orange, charter.green, charter.gold, charter.ink] as const;

const PILLARS = [
  {
    icon: Compass,
    title: "Vision",
    description:
      "Faire de chaque jeune nigérien un acteur du changement — capable de créer des opportunités plutôt que d'en attendre, et de porter avec fierté les valeurs de la nation.",
  },
  {
    icon: Target,
    title: "Mission",
    description:
      "Outiller la jeunesse pour un véritable changement de mentalité vers l'esprit d'entreprise et le leadership, en transformant les chercheurs d'emploi en créateurs d'emploi.",
  },
  {
    icon: Rocket,
    title: "Objectifs",
    description:
      "Former, accompagner et mettre en réseau des jeunes leaders et ambassadeurs dans toutes les régions du pays, autour d'un thème fédérateur renouvelé chaque édition.",
  },
  {
    icon: HeartHandshake,
    title: "Valeurs",
    description:
      "Patriotisme, initiative, courage et engagement citoyen — le socle sur lequel se construit chaque parcours au sein de l'écosystème JNJL.",
  },
] as const;

export function AboutSection() {
  return (
    <section id="a-propos" className="bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="À propos"
          title="Qu'est-ce que la JNJL ?"
          description="La Journée Nationale du Jeune Leader est un événement national qui rassemble chaque année les jeunes les plus engagés du Niger, autour de l'entrepreneuriat, du leadership et du patriotisme."
          className="mb-14"
        />

        <Reveal stagger={0.12} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, index) => {
            const color = PILLAR_COLORS[index];
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="group relative overflow-hidden rounded-2xl border bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ borderColor: charter.border }}
              >
                <span
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="h-7 w-7" style={{ color: color === charter.gold ? charter.ink : "#fff" }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: charter.ink }}>
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: charter.inkSoft }}>
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
