"use client";

import { useEffect, useState, useTransition } from "react";
import { Mic2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProgramSessionAction,
  updateProgramSessionAction,
} from "@/actions/program-actions";
import { sessionTypes, type ProgramSessionInput } from "@/schemas/program";
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
  speakers: { speakerId: string }[];
};

type SpeakerOption = { id: string; firstName: string; lastName: string };

function toTimeInputValue(date: Date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ProgramSessionDialog({
  open,
  onOpenChange,
  programDayId,
  session,
  speakers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programDayId: string;
  session: Session | null;
  speakers: SpeakerOption[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProgramSessionInput>(emptyForm(programDayId, session));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(emptyForm(programDayId, session));
      setError("");
    }
  }, [open, programDayId, session]);

  const update = <K extends keyof ProgramSessionInput>(
    field: K,
    value: ProgramSessionInput[K]
  ) => setForm(current => ({ ...current, [field]: value }));

  const toggleSpeaker = (speakerId: string) => {
    setForm(current => ({
      ...current,
      speakerIds: current.speakerIds.includes(speakerId)
        ? current.speakerIds.filter(id => id !== speakerId)
        : [...current.speakerIds, speakerId],
    }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (session) {
          await updateProgramSessionAction(session.id, form);
        } else {
          await createProgramSessionAction(form);
        }
        onSaved();
        onOpenChange(false);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} closeOnOutsideClick={false}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mic2 className="h-4 w-4" />
              </span>
              <DialogTitle>
                {session ? "Modifier la session" : "Ajouter une session"}
              </DialogTitle>
            </div>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Field>
            <FieldLabel>Titre</FieldLabel>
            <Input
              value={form.title}
              onChange={event => update("title", event.target.value)}
              required
              autoFocus
              placeholder="Cérémonie d’ouverture"
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={form.type}
                onValueChange={value => update("type", value as ProgramSessionInput["type"])}
              >
                <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
                  <SelectValue>
                    {(value: string) => TYPE_LABEL[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sessionTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Début</FieldLabel>
              <Input
                type="time"
                value={form.startTime}
                onChange={event => update("startTime", event.target.value)}
                required
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
            <Field>
              <FieldLabel>Fin</FieldLabel>
              <Input
                type="time"
                value={form.endTime}
                onChange={event => update("endTime", event.target.value)}
                required
                className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Lieu</FieldLabel>
            <Input
              value={form.location}
              onChange={event => update("location", event.target.value)}
              placeholder="Grand amphithéâtre"
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={form.description}
              onChange={event => update("description", event.target.value)}
              className="min-h-[70px] rounded-none border border-border bg-muted/40 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          {speakers.length > 0 && (
            <Field>
              <FieldLabel>Intervenants</FieldLabel>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-none border border-border bg-muted/40 p-3">
                {speakers.map(speaker => (
                  <label
                    key={speaker.id}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <Checkbox
                      checked={form.speakerIds.includes(speaker.id)}
                      onCheckedChange={() => toggleSpeaker(speaker.id)}
                    />
                    {speaker.firstName} {speaker.lastName}
                  </label>
                ))}
              </div>
            </Field>
          )}
          <DialogFooter className="rounded-none">
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              loading={isPending}
              className="text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              {isPending
                ? "Enregistrement..."
                : session
                  ? "Enregistrer"
                  : "Ajouter la session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(programDayId: string, session: Session | null): ProgramSessionInput {
  return {
    programDayId,
    title: session?.title ?? "",
    description: session?.description ?? "",
    type: (session?.type as ProgramSessionInput["type"]) ?? "CONFERENCE",
    startTime: session ? toTimeInputValue(session.startTime) : "",
    endTime: session ? toTimeInputValue(session.endTime) : "",
    location: session?.location ?? "",
    speakerIds: session?.speakers.map(link => link.speakerId) ?? [],
  };
}
