"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENDER_OPTIONS, formatGender } from "@/lib/gender";

type Application = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string | null;
  status: string;
  createdAt: Date;
  region: { name: string; code: string } | null;
  edition: { name: string; year: number };
  user: { id: string } | null;
  participation: { badgeNumber: string | null } | null;
};

const labels: Record<string, string> = {
  SOUMIS: "Soumise",
  EN_COURS_ANALYSE: "En analyse",
  RETENU: "Confirmée",
  NON_RETENU: "Rejetée",
  LISTE_ATTENTE: "Liste d'attente",
};

const ALL = "__ALL__";

export function EventApplicationManager({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState(ALL);
  const [genderFilter, setGenderFilter] = useState(ALL);

  const regions = useMemo(() => {
    const map = new Map<string, string>();
    for (const application of initialApplications) {
      if (application.region) map.set(application.region.name, application.region.name);
    }
    return Array.from(map.keys()).sort();
  }, [initialApplications]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialApplications.filter(item => {
      if (regionFilter !== ALL && item.region?.name !== regionFilter) return false;
      if (genderFilter !== ALL && item.gender !== genderFilter) return false;
      if (!query) return true;
      return `${item.firstName} ${item.lastName} ${item.email} ${item.region?.name ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [initialApplications, search, regionFilter, genderFilter]);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Candidatures
        </p>
        <h1 className="mt-1 text-3xl font-bold">Participants</h1>
        <p className="mt-2 text-muted-foreground">
          Consultez et filtrez les personnes inscrites pour participer à l&apos;événement.
          L&apos;inscription vaut confirmation immédiate : aucune validation n&apos;est nécessaire.
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liste des participants</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} participant{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={regionFilter} onValueChange={value => setRegionFilter(value ?? ALL)}>
              <SelectTrigger className="h-10 w-full rounded-none border border-border bg-muted/40 px-3 sm:w-44">
                <SelectValue placeholder="Région">
                  {(value: string) => (value === ALL ? "Toutes les régions" : value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes les régions</SelectItem>
                {regions.map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={value => setGenderFilter(value ?? ALL)}>
              <SelectTrigger className="h-10 w-full rounded-none border border-border bg-muted/40 px-3 sm:w-40">
                <SelectValue placeholder="Sexe">
                  {(value: string) => (value === ALL ? "Tous" : formatGender(value))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {GENDER_OPTIONS.map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Rechercher..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Candidat</th>
                <th className="px-5 py-4">Sexe</th>
                <th className="px-5 py-4">Région</th>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4">Badge</th>
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
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatGender(application.gender)}
                  </td>
                  <td className="px-5 py-4">{application.region?.name ?? "—"}</td>
                  <td className="px-5 py-4">
                    {application.edition.name} ({application.edition.year})
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                    {application.participation?.badgeNumber ?? "—"}
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
                          <Link href={`/admin/candidatures/participants/${application.id}`} />
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Aucun participant trouvé.
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
