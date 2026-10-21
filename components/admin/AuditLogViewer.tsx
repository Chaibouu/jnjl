"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Search } from "lucide-react";
import { listAuditLogAction, type AuditEntry } from "@/actions/audit-log-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ActionOption = { code: string; label: string };

export function AuditLogViewer({
  initialEntries,
  actions,
}: {
  initialEntries: AuditEntry[];
  actions: ActionOption[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [includeLogins, setIncludeLogins] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = (next?: { action?: string; search?: string; includeLogins?: boolean }) =>
    startTransition(async () => {
      setError("");
      try {
        const result = await listAuditLogAction({
          action: (next?.action ?? action) || undefined,
          search: next?.search ?? search,
          includeLogins: next?.includeLogins ?? includeLogins,
        });
        setEntries(result.entries);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Impossible de charger le journal");
      }
    });

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Administration · Super Admin</p>
        <h1 className="mt-1 text-3xl font-bold">Journal d&apos;audit</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Qui a fait quoi, sur qui et quand : comptes supprimés ou désactivés, candidatures acceptées ou rejetées, badges,
          paiements manuels, classement et sélection. Les 500 derniers événements.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
            Type d&apos;action
            <select
              value={action}
              onChange={event => {
                setAction(event.target.value);
                load({ action: event.target.value });
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground"
            >
              <option value="">Toutes les actions d&apos;administration</option>
              {actions.map(option => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <form
            className="relative flex-1"
            onSubmit={event => {
              event.preventDefault();
              load();
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              placeholder="Rechercher un auteur, un compte, un e-mail…"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </form>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeLogins}
              onChange={event => {
                setIncludeLogins(event.target.checked);
                load({ includeLogins: event.target.checked });
              }}
            />
            Inclure les connexions
          </label>
          <Button type="button" variant="outline" loading={isPending} onClick={() => load()} className="gap-2 rounded-none">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
        {error && <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Auteur</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Cible</th>
                <th className="px-5 py-3">Détails</th>
                <th className="px-5 py-3">Adresse IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(entry => (
                <tr key={entry.id} className="align-top hover:bg-muted/30">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })}
                  </td>
                  <td className="px-5 py-3">
                    {entry.actor ? (
                      <>
                        <p className="font-medium">{entry.actor.name ?? entry.actor.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.actor.email} · {entry.actor.role}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Système / inconnu</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        entry.status === "FAILURE" ? "bg-red-100 text-red-700" : "bg-muted"
                      }`}
                    >
                      {entry.actionLabel}
                    </span>
                  </td>
                  <td className="px-5 py-3">{entry.target || "—"}</td>
                  <td className="max-w-xs px-5 py-3 text-xs text-muted-foreground">{entry.details || "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{entry.ipAddress ?? "—"}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    Aucun événement. Les actions faites à partir de maintenant apparaîtront ici.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
