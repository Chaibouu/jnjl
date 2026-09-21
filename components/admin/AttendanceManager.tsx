"use client";

import { useState, useTransition } from "react";
import { ScanLine, UserCheck } from "lucide-react";
import {
  checkInByBadgeAction,
  listAttendanceAction,
  listAttendanceSessionsAction,
} from "@/actions/attendance-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EditionOption = { id: string; name: string; year: number };
type Sessions = Awaited<ReturnType<typeof listAttendanceSessionsAction>>;
type Data = Awaited<ReturnType<typeof listAttendanceAction>>;

const WHOLE_EVENT = "__event__";

export function AttendanceManager({
  editions,
  initialEditionId,
  initialSessions,
  initialData,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialSessions: Sessions;
  initialData: Data;
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [sessions, setSessions] = useState(initialSessions);
  const [sessionId, setSessionId] = useState(WHOLE_EVENT);
  const [data, setData] = useState(initialData);
  const [badgeNumber, setBadgeNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const sessionArg = (value: string) => (value === WHOLE_EVENT ? null : value);

  const reload = async (nextEditionId: string, nextSessionId: string) => {
    const [nextSessions, nextData] = await Promise.all([
      listAttendanceSessionsAction(nextEditionId),
      listAttendanceAction(nextEditionId, sessionArg(nextSessionId)),
    ]);
    setSessions(nextSessions);
    setData(nextData);
  };

  const run = (task: () => Promise<void>) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await task();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    setSessionId(WHOLE_EVENT);
    run(() => reload(value, WHOLE_EVENT));
  };

  const changeSession = (value: string | null) => {
    if (!value) return;
    setSessionId(value);
    run(() => reload(editionId, value));
  };

  const checkIn = (number: string) => {
    run(async () => {
      const result = await checkInByBadgeAction(editionId, number, sessionArg(sessionId));
      setBadgeNumber("");
      await reload(editionId, sessionId);
      setMessage(`Présence enregistrée : ${result.name}`);
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Événement</p>
          <h1 className="mt-1 text-3xl font-bold">Présence</h1>
          <p className="mt-2 text-muted-foreground">
            Pointez les participants en saisissant ou en scannant le numéro de leur badge.
            {` ${data.total} pointage(s).`}
          </p>
        </div>
        <div className="grid w-full gap-3 sm:w-72">
          <Select value={editionId} onValueChange={changeEdition}>
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Choisir une édition">
                {(value: string) => {
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
          <Select value={sessionId} onValueChange={changeSession}>
            <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
              <SelectValue placeholder="Événement complet">
                {(value: string) =>
                  value === WHOLE_EVENT
                    ? "Événement complet"
                    : (sessions.find(item => item.id === value)?.title ?? "Session")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WHOLE_EVENT}>Événement complet</SelectItem>
              {sessions.map(session => (
                <SelectItem key={session.id} value={session.id}>
                  {session.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <form
        className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row"
        onSubmit={event => {
          event.preventDefault();
          checkIn(badgeNumber);
        }}
      >
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={badgeNumber}
            onChange={event => setBadgeNumber(event.target.value)}
            placeholder="JNJL-2026-AMB-0001"
            autoFocus
            className="h-11 rounded-none border border-border bg-muted/40 pl-9 font-mono"
          />
        </div>
        <Button type="submit" loading={isPending} disabled={!badgeNumber.trim()} className="h-11 rounded-none px-6">
          <UserCheck className="mr-2 h-4 w-4" />
          Pointer
        </Button>
      </form>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Ambassadeurs à pointer</h2>
            <p className="text-sm text-muted-foreground">Embarqués, pas encore présents ({data.awaiting.length})</p>
          </div>
          <div className="divide-y">
            {data.awaiting.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{item.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.region}
                    {item.badgeNumber ? ` · ${item.badgeNumber}` : ""}
                  </p>
                </div>
                {item.badgeNumber && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => checkIn(item.badgeNumber!)}
                    className="rounded-none"
                  >
                    Pointer
                  </Button>
                )}
              </div>
            ))}
            {data.awaiting.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Personne en attente.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Derniers pointages</h2>
          </div>
          <div className="divide-y">
            {data.records.map(record => (
              <div key={record.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{record.user?.name ?? record.user?.email ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{record.session?.title ?? "Événement complet"}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(record.checkedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {data.records.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aucun pointage.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
