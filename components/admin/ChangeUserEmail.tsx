"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import {
  changeUserEmailAction,
  searchUsersForEmailChangeAction,
  type UserEmailRow,
} from "@/actions/user-email-actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";

const fieldClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

/** Recherche un compte puis remplace son adresse e-mail (Super Admin). */
export function ChangeUserEmail() {
  const { confirm } = useConfirm();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserEmailRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<UserEmailRow | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [markVerified, setMarkVerified] = useState(true);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();

  const search = () => {
    setFeedback(null);
    startSearch(async () => {
      try {
        setResults(await searchUsersForEmailChangeAction(query));
        setSearched(true);
      } catch (error) {
        setFeedback({ ok: false, text: error instanceof Error ? error.message : "Recherche impossible" });
      }
    });
  };

  const save = async () => {
    if (!selected) return;
    const confirmed = await confirm({
      title: "Changer l'adresse e-mail ?",
      description: (
        <>
          Remplacer <strong>{selected.email || "l'adresse actuelle"}</strong> par{" "}
          <strong>{newEmail.trim().toLowerCase()}</strong> ?
        </>
      ),
      confirmLabel: "Remplacer",
    });
    if (!confirmed) return;
    setFeedback(null);
    startSave(async () => {
      const result = await changeUserEmailAction(selected.id, newEmail, markVerified);
      if (result.ok) {
        setFeedback({ ok: true, text: `E-mail modifié : ${result.email}` });
        setSelected({ ...selected, email: result.email, emailVerified: markVerified });
        setResults(previous => previous.map(row => (row.id === selected.id ? { ...row, email: result.email } : row)));
        setNewEmail("");
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Rechercher un compte (nom ou e-mail)</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder="Nom ou ancienne adresse"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => event.key === "Enter" && search()}
            />
          </div>
          <Button type="button" className="h-10" loading={isSearching} onClick={search} disabled={query.trim().length < 2}>
            Chercher
          </Button>
        </div>

        {results.length > 0 && (
          <ul className="mt-3 divide-y rounded-lg border">
            {results.map(row => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(row);
                    setFeedback(null);
                    setNewEmail("");
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40 ${
                    selected?.id === row.id ? "bg-muted/60" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{row.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{row.email || "Sans e-mail"}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{row.role}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searched && results.length === 0 && !isSearching && (
          <p className="mt-3 text-xs text-muted-foreground">Aucun compte trouvé.</p>
        )}
      </div>

      {selected && (
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          <div>
            <p className="font-semibold">{selected.name}</p>
            <p className="text-sm text-muted-foreground">
              Adresse actuelle : <span className="font-medium text-foreground">{selected.email || "aucune"}</span>
              {selected.emailVerified ? " (vérifiée)" : " (non vérifiée)"}
            </p>
          </div>
          <label className="block space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Nouvelle adresse e-mail</span>
            <input
              type="email"
              className={fieldClass}
              placeholder="nouvelle.adresse@exemple.com"
              value={newEmail}
              onChange={event => setNewEmail(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={markVerified} onChange={event => setMarkVerified(event.target.checked)} />
            Marquer la nouvelle adresse comme vérifiée
          </label>
          <Button type="button" loading={isSaving} onClick={save} disabled={!newEmail.trim()}>
            Enregistrer la nouvelle adresse
          </Button>
        </div>
      )}

      {feedback && <p className={`text-sm ${feedback.ok ? "text-green-600" : "text-destructive"}`}>{feedback.text}</p>}
    </div>
  );
}
