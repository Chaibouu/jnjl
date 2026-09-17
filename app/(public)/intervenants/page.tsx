import { listActiveEditionSpeakersAction } from "@/actions/speaker-actions";
import charter from "@/settings/charter";

export default async function SpeakersPage() {
  const speakers = await listActiveEditionSpeakersAction();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Intervenants
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Ceux qui font la JNJL</h1>
      </div>

      {speakers.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          Aucun intervenant annoncé pour l’édition en cours.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {speakers.map(speaker => (
            <div key={speaker.id} className="rounded-2xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-primary">
                {speaker.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={speaker.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  `${speaker.firstName[0] ?? ""}${speaker.lastName[0] ?? ""}`.toUpperCase()
                )}
              </div>
              <p className="mt-4 font-semibold">
                {speaker.firstName} {speaker.lastName}
              </p>
              {speaker.role && <p className="text-sm text-muted-foreground">{speaker.role}</p>}
              {speaker.organization && (
                <p className="text-xs text-muted-foreground">{speaker.organization}</p>
              )}
              {speaker.bio && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{speaker.bio}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
