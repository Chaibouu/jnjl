"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarPlus, Clock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteProgramDayAction,
  deleteProgramSessionAction,
  listProgramDaysAction,
} from "@/actions/program-actions";
import { ProgramDayDialog } from "@/components/admin/ProgramDayDialog";
import { ProgramSessionDialog } from "@/components/admin/ProgramSessionDialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import charter from "@/settings/charter";

const TYPE_LABEL: Record<string, string> = {
  CONFERENCE: "Conférence",
  PANEL: "Panel",
  ATELIER: "Atelier",
  CEREMONIE: "Cérémonie",
  AUTRE: "Autre",
};

type Session = {
  id: string;
  programDayId: string;
  title: string;
  description: string | null;
  type: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  speakers: { speakerId: string; speaker: { id: string; firstName: string; lastName: string } }[];
};

type ProgramDay = {
  id: string;
  date: Date;
  title: string | null;
  sessions: Session[];
};

type EditionOption = { id: string; name: string; year: number };
type SpeakerOption = { id: string; firstName: string; lastName: string };

export function ProgramManager({
  editions,
  speakers,
}: {
  editions: EditionOption[];
  speakers: SpeakerOption[];
}) {
  const [editionId, setEditionId] = useState(editions[0]?.id ?? "");
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [sessionDialogState, setSessionDialogState] = useState<{
    programDayId: string;
    session: Session | null;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirm();

  const loadDays = (id: string) => {
    startTransition(async () => {
      try {
        setDays(await listProgramDaysAction(id));
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible de charger le programme"
        );
      }
    });
  };

  useEffect(() => {
    if (editionId) loadDays(editionId);
  }, [editionId]);

  const removeDay = async (day: ProgramDay) => {
    const confirmed = await confirm({
      title: "Supprimer ce jour ?",
      description: "Toutes les sessions de ce jour seront également supprimées.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!confirmed) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deleteProgramDayAction(day.id);
        setDays(current => current.filter(item => item.id !== day.id));
        setMessage("Jour supprimé");
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const removeSession = async (session: Session) => {
    const confirmed = await confirm({
      title: `Supprimer la session « ${session.title} » ?`,
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!confirmed) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await deleteProgramSessionAction(session.id);
        loadDays(editionId);
        setMessage("Session supprimée");
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Contenus
          </p>
          <h1 className="mt-1 text-3xl font-bold">Programme</h1>
          <p className="mt-2 text-muted-foreground">
            Construisez le déroulé jour par jour d’une édition.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={editionId || null} onValueChange={value => setEditionId((value as string) ?? "")}>
            <SelectTrigger className="h-10 w-56 rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir une édition">
                {(value: string | null) => {
                  const edition = editions.find(item => item.id === value);
                  return edition ? `${edition.name} (${edition.year})` : "Choisir une édition";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {editions.map(edition => (
                <SelectItem key={edition.id} value={edition.id}>
                  {edition.name} ({edition.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setDayDialogOpen(true)}
            disabled={!editionId}
            className="h-10 rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Ajouter un jour
          </Button>
        </div>
      </header>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {days.map(day => (
          <div key={day.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
              <div>
                <p className="font-semibold">
                  {new Date(day.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {day.title && <p className="text-sm text-muted-foreground">{day.title}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-none hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                  onClick={() => setSessionDialogState({ programDayId: day.id, session: null })}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Session
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="Supprimer ce jour"
                  onClick={() => removeDay(day)}
                  disabled={isPending}
                  className="hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="divide-y">
              {day.sessions.map(session => (
                <div key={session.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {TYPE_LABEL[session.type] ?? session.type}
                      </span>
                      <p className="font-medium">{session.title}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      title="Modifier"
                      onClick={() => setSessionDialogState({ programDayId: day.id, session })}
                      className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      title="Supprimer"
                      onClick={() => removeSession(session)}
                      className="hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {day.sessions.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                  Aucune session pour ce jour.
                </p>
              )}
            </div>
          </div>
        ))}
        {days.length === 0 && (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
            Aucun jour de programme pour cette édition.
          </div>
        )}
      </div>

      {editionId && (
        <ProgramDayDialog
          open={dayDialogOpen}
          onOpenChange={setDayDialogOpen}
          editionId={editionId}
          onSaved={() => loadDays(editionId)}
        />
      )}

      {sessionDialogState && (
        <ProgramSessionDialog
          open={Boolean(sessionDialogState)}
          onOpenChange={open => {
            if (!open) setSessionDialogState(null);
          }}
          programDayId={sessionDialogState.programDayId}
          session={sessionDialogState.session}
          speakers={speakers}
          onSaved={() => loadDays(editionId)}
        />
      )}
    </section>
  );
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
