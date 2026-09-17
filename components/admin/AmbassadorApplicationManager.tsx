"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Eye, Search, X } from "lucide-react";
import {
  acceptAmbassadorApplicationAction,
  rejectAmbassadorApplicationAction,
} from "@/actions/ambassador-application-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Application = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: Date;
  region: { name: string; code: string };
  edition: { name: string; year: number };
  user: { id: string } | null;
};
const labels: Record<string, string> = {
  SOUMIS: "Soumise",
  EN_COURS_ANALYSE: "En analyse",
  RETENU: "Acceptée",
  NON_RETENU: "Rejetée",
  LISTE_ATTENTE: "Liste d’attente",
};

export function AmbassadorApplicationManager({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? applications.filter(item =>
          `${item.firstName} ${item.lastName} ${item.email} ${item.region.name}`
            .toLowerCase()
            .includes(query)
        )
      : applications;
  }, [applications, search]);

  const accept = (application: Application) => {
    if (
      !window.confirm(
        `Accepter la candidature de ${application.firstName} ${application.lastName} ?`
      )
    )
      return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await acceptAmbassadorApplicationAction(application.id);
        setApplications(items =>
          items.map(item =>
            item.id === application.id
              ? { ...item, status: "RETENU", user: { id: "created" } }
              : item
          )
        );
        setMessage("Candidature acceptée et compte créé.");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible d’accepter la candidature"
        );
      }
    });
  };
  const reject = (application: Application) => {
    const reason = window.prompt("Motif du rejet", "Candidature non retenue");
    if (reason === null) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await rejectAmbassadorApplicationAction(application.id, reason);
        setApplications(items =>
          items.map(item =>
            item.id === application.id
              ? { ...item, status: "NON_RETENU" }
              : item
          )
        );
        setMessage("Candidature rejetée.");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible de rejeter la candidature"
        );
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Ambassadeurs
        </p>
        <h1 className="mt-1 text-3xl font-bold">Candidatures</h1>
        <p className="mt-2 text-muted-foreground">
          Examinez les demandes. Le compte utilisateur est créé uniquement après
          acceptation.
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Demandes reçues</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} candidature{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
        {message && (
          <p className="border-b px-5 py-3 text-sm text-green-600">{message}</p>
        )}
        {error && (
          <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Candidat</th>
                <th className="px-5 py-4">Région</th>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(application => (
                <tr key={application.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {application.firstName} {application.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {application.email} · {application.phone}
                    </p>
                  </td>
                  <td className="px-5 py-4">{application.region.name}</td>
                  <td className="px-5 py-4">
                    {application.edition.name} ({application.edition.year})
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {labels[application.status] ?? application.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Voir"
                        nativeButton={false}
                        render={
                          <Link
                            href={`/admin/ambassadeurs/candidatures/${application.id}`}
                          />
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {["SOUMIS", "EN_COURS_ANALYSE", "LISTE_ATTENTE"].includes(
                        application.status
                      ) && (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Accepter"
                            onClick={() => accept(application)}
                            disabled={isPending}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Rejeter"
                            onClick={() => reject(application)}
                            disabled={isPending}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Aucune candidature trouvée.
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
