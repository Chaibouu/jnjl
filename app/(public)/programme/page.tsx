import { CalendarDays, Clock, MapPin, Mic } from "lucide-react";
import { listActiveEditionProgramAction } from "@/actions/program-actions";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import charter from "@/settings/charter";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Programme",
  description:
    "Découvrez le programme de la Journée Nationale du Jeune Leader : conférences, ateliers, rencontres et activités jour par jour, à Niamey.",
  path: "/programme",
});

const TYPE_LABEL: Record<string, string> = {
  CONFERENCE: "Conférence",
  PANEL: "Panel",
  ATELIER: "Atelier",
  CEREMONIE: "Cérémonie",
  AUTRE: "Autre",
};

// Une couleur de la charte par type de session : on repère le déroulé d'un coup d'œil.
const TYPE_COLOR: Record<string, string> = {
  CONFERENCE: charter.orange,
  PANEL: charter.green,
  ATELIER: "#B58500",
  CEREMONIE: charter.ink,
  AUTRE: "#6b7280",
};

export default async function ProgramPage() {
  const days = await listActiveEditionProgramAction();
  const sessionCount = days.reduce((total, day) => total + day.sessions.length, 0);

  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow="Programme"
        title="Le déroulé de l’édition"
        description="Conférences, panels, ateliers et cérémonies : retrouvez jour par jour tout ce qui rythme la JNJL."
        image="/entetes/programme.jpg"
        imagePosition="50% 38%"
        tint="orange"
      >
        {days.length > 0 && (
          <>
            <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <CalendarDays className="h-4 w-4" style={{ color: charter.gold }} />
              {days.length} jour{days.length > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Mic className="h-4 w-4" style={{ color: charter.gold }} />
              {sessionCount} session{sessionCount > 1 ? "s" : ""}
            </span>
          </>
        )}
      </PageHero>

      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6">
        {days.length === 0 ? (
          <p className="rounded-2xl border bg-white p-10 text-center text-muted-foreground shadow-sm">
            Le programme n’a pas encore été publié pour l’édition en cours.
          </p>
        ) : (
          <div className="space-y-14">
            {days.map((day, dayIndex) => {
              const date = new Date(day.date);
              return (
                <section key={day.id}>
                  <div
                    className="sticky top-16 z-10 flex items-center gap-4 rounded-2xl px-4 py-3 text-white shadow-lg sm:px-5"
                    style={{ background: `linear-gradient(120deg, ${charter.ink}, ${charter.ink}dd)` }}
                  >
                    <div
                      className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl leading-none text-white"
                      style={{ backgroundColor: charter.orange }}
                    >
                      <span className="text-xl font-extrabold">{date.toLocaleDateString("fr-FR", { day: "2-digit" })}</span>
                      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {date.toLocaleDateString("fr-FR", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: charter.gold }}>
                        Jour {dayIndex + 1}
                      </p>
                      <p className="truncate font-semibold capitalize">
                        {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                      {day.title && <p className="truncate text-sm text-white/70">{day.title}</p>}
                    </div>
                  </div>

                  <Reveal
                    stagger={0.08}
                    className="relative mt-6 space-y-4 border-l-2 pl-6 sm:pl-8"
                  >
                    {day.sessions.map(session => {
                      const color = TYPE_COLOR[session.type] ?? charter.orange;
                      return (
                        <article
                          key={session.id}
                          className="group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                          style={{ borderColor: charter.border }}
                        >
                          <span
                            className="absolute -left-[33px] top-6 h-4 w-4 rounded-full border-4 border-white sm:-left-[41px]"
                            style={{ backgroundColor: color, boxShadow: `0 0 0 2px ${color}55` }}
                          />
                          <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color }} />
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                              style={{ backgroundColor: color }}
                            >
                              {TYPE_LABEL[session.type] ?? session.type}
                            </span>
                            <span
                              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{ backgroundColor: `${color}14`, color }}
                            >
                              <Clock className="h-3 w-3" />
                              {formatTime(session.startTime)} — {formatTime(session.endTime)}
                            </span>
                          </div>
                          <h2 className="mt-3 text-lg font-bold leading-snug" style={{ color: charter.ink }}>
                            {session.title}
                          </h2>
                          {session.description && (
                            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: charter.inkSoft }}>
                              {session.description}
                            </p>
                          )}
                          {(session.location || session.speakers.length > 0) && (
                            <div
                              className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-xs"
                              style={{ borderColor: charter.border, color: charter.inkFaint }}
                            >
                              {session.location && (
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" style={{ color: charter.orange }} />
                                  {session.location}
                                </span>
                              )}
                              {session.speakers.length > 0 && (
                                <span className="flex items-center gap-1.5">
                                  <Mic className="h-3.5 w-3.5" style={{ color: charter.green }} />
                                  {session.speakers
                                    .map(link => `${link.speaker.firstName} ${link.speaker.lastName}`)
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {day.sessions.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune session programmée.</p>
                    )}
                  </Reveal>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
