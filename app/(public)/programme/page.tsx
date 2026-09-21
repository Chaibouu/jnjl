import { Clock, MapPin } from "lucide-react";
import { listActiveEditionProgramAction } from "@/actions/program-actions";
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

export default async function ProgramPage() {
  const days = await listActiveEditionProgramAction();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Programme
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Le déroulé de l’édition</h1>
      </div>

      {days.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          Le programme n’a pas encore été publié pour l’édition en cours.
        </p>
      ) : (
        <div className="mt-12 space-y-10">
          {days.map(day => (
            <div key={day.id}>
              <div className="sticky top-16 z-10 -mx-4 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
                <p className="font-semibold">
                  {new Date(day.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </p>
                {day.title && <p className="text-sm text-muted-foreground">{day.title}</p>}
              </div>
              <div className="mt-4 space-y-4 border-l-2 pl-5" style={{ borderColor: `${charter.orange}40` }}>
                {day.sessions.map(session => (
                  <div key={session.id} className="relative rounded-xl border bg-white p-4 shadow-sm">
                    <span
                      className="absolute -left-[27px] top-5 h-3 w-3 rounded-full"
                      style={{ backgroundColor: charter.orange }}
                    />
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {TYPE_LABEL[session.type] ?? session.type}
                    </span>
                    <p className="mt-1.5 font-semibold">{session.title}</p>
                    {session.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{session.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(session.startTime)} — {formatTime(session.endTime)}
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </span>
                      )}
                      {session.speakers.length > 0 && (
                        <span>
                          {session.speakers
                            .map(link => `${link.speaker.firstName} ${link.speaker.lastName}`)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {day.sessions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune session programmée.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
