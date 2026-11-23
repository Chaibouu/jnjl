"use client";

import { useMemo, useState, useTransition } from "react";
import { FileSpreadsheet, RefreshCw, RotateCcw, Search } from "lucide-react";
import { reconcileScanHubAction } from "@/actions/attendance-actions";
import {
  exportParticipantAttendanceExcelAction,
  listParticipantAttendanceAction,
  type ParticipantAttendanceRow,
} from "@/actions/participant-attendance-actions";
import { ListPagination, PAGE_SIZE_OPTIONS } from "@/components/admin/ListPagination";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

type Status = "ALL" | "PRESENT" | "ABSENT";

const selectClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const ENTREPRENEURSHIP_LABEL: Record<string, string> = { OUI: "Oui", PEUT_ETRE: "Peut-être", NON: "Non" };

function Stat({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl border bg-card p-4 shadow-sm"
      style={accent ? { borderColor: charter.orange, background: `${charter.orange}0d` } : undefined}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums" style={accent ? { color: charter.orange } : undefined}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Pointage des participants à l'événement : présents / absents, filtres, pagination et export Excel. */
export function ParticipantAttendanceView({
  editionId,
  rows: initialRows,
}: {
  editionId: string;
  rows: ParticipantAttendanceRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState<Status>("ALL");
  const [gender, setGender] = useState("");
  const [profession, setProfession] = useState("");
  const [entrepreneurship, setEntrepreneurship] = useState("");
  const [travel, setTravel] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[1]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isExporting, startExport] = useTransition();
  const [isRefreshing, startRefresh] = useTransition();

  /** Relit les scans de ScanHub (ceux que le webhook n'aurait pas apportés), puis recharge la liste. */
  const refreshFromScanHub = () =>
    startRefresh(async () => {
      setError("");
      setMessage("");
      try {
        const result = await reconcileScanHubAction();
        setRows(await listParticipantAttendanceAction(editionId));
        if (result.error) setError(`ScanHub : ${result.error}`);
        else
          setMessage(
            result.checkedIn > 0
              ? `${result.checkedIn} présence(s) récupérée(s) depuis ScanHub (${result.read} scan(s) relus).`
              : `Liste à jour : aucune nouvelle présence (${result.read} scan(s) relus).`
          );
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Actualisation impossible, réessayez");
      }
    });

  const regions = useMemo(() => [...new Set(rows.map(row => row.region).filter(Boolean))].sort(), [rows]);
  const professions = useMemo(() => [...new Set(rows.map(row => row.profession).filter(Boolean))].sort(), [rows]);
  const hasTravelAnswers = useMemo(() => rows.some(row => row.travel), [rows]);

  // Les filtres (hors état de présence) définissent la population : les compteurs et les pastilles de présence la suivent.
  const population = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(
      row =>
        (!region || row.region === region) &&
        (!gender || row.gender === gender) &&
        (!profession || row.profession === profession) &&
        (!entrepreneurship || row.entrepreneurship === entrepreneurship) &&
        (!travel || row.travel === travel) &&
        (!query || `${row.fullName} ${row.phone} ${row.badgeNumber}`.toLowerCase().includes(query))
    );
  }, [rows, region, gender, profession, entrepreneurship, travel, search]);

  const present = population.filter(row => row.firstCheckIn).length;
  const rate = population.length ? Math.round((present / population.length) * 100) : 0;

  const visible = useMemo(
    () => population.filter(row => status === "ALL" || (status === "PRESENT") === !!row.firstCheckIn),
    [population, status]
  );

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasFilters = !!(region || gender || profession || entrepreneurship || travel || search.trim() || status !== "ALL");

  /** Chaque changement de filtre ramène à la première page. */
  const filter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const resetFilters = () => {
    setRegion("");
    setStatus("ALL");
    setGender("");
    setProfession("");
    setEntrepreneurship("");
    setTravel("");
    setSearch("");
    setPage(1);
  };

  const exportExcel = () =>
    startExport(async () => {
      setError("");
      const result = await exportParticipantAttendanceExcelAction(editionId, {
        region: region || undefined,
        status,
        search,
        gender: gender || undefined,
        profession: profession || undefined,
        entrepreneurship: entrepreneurship || undefined,
        travel: travel || undefined,
      });
      if (!result.ok) return setError(result.error);
      const bytes = Uint8Array.from(atob(result.base64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    });

  const statusChips: { value: Status; label: string; count: number }[] = [
    { value: "ALL", label: "Tous", count: population.length },
    { value: "PRESENT", label: "Présents", count: present },
    { value: "ABSENT", label: "Pas encore pointés", count: population.length - present },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <Button type="button" loading={isRefreshing} onClick={refreshFromScanHub} className="gap-2 rounded-none">
          <RefreshCw className="h-4 w-4" />
          Actualiser depuis ScanHub
        </Button>
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          Si un badge scanné n&apos;apparaît pas comme présent, cliquez ici : les scans de ScanHub sont relus et la liste est mise à jour.
        </p>
      </div>
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Participants inscrits" value={population.length} hint={hasFilters ? "Selon les filtres" : "Tous"} />
        <Stat label="Présents (pointés)" value={present} accent />
        <Stat label="Pas encore pointés" value={population.length - present} />
        <Stat label="Taux de présence" value={`${rate} %`} />
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {statusChips.map(chip => {
            const active = status === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => filter(setStatus)(chip.value)}
                className="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
                style={
                  active
                    ? { backgroundColor: charter.orange, borderColor: charter.orange, color: "#fff" }
                    : { backgroundColor: "transparent" }
                }
              >
                {chip.label} <span className={active ? "opacity-90" : "text-muted-foreground"}>({chip.count})</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FilterField label="Rechercher">
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${selectClass} pl-9`}
                placeholder="Nom, téléphone, n° de badge…"
                value={search}
                onChange={event => filter(setSearch)(event.target.value)}
              />
            </span>
          </FilterField>
          <FilterField label="Région">
            <select className={selectClass} value={region} onChange={event => filter(setRegion)(event.target.value)}>
              <option value="">Toutes les régions</option>
              {regions.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Sexe">
            <select className={selectClass} value={gender} onChange={event => filter(setGender)(event.target.value)}>
              <option value="">Tous</option>
              <option value="Masculin">Masculin</option>
              <option value="Féminin">Féminin</option>
            </select>
          </FilterField>
          <FilterField label="Profession">
            <select className={selectClass} value={profession} onChange={event => filter(setProfession)(event.target.value)}>
              <option value="">Toutes les professions</option>
              {professions.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Engagement à l'entrepreneuriat">
            <select
              className={selectClass}
              value={entrepreneurship}
              onChange={event => filter(setEntrepreneurship)(event.target.value)}
            >
              <option value="">Tous</option>
              {Object.entries(ENTREPRENEURSHIP_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </FilterField>
          {hasTravelAnswers && (
            <FilterField label="Déplacement à Niamey (hors Niamey)">
              <select className={selectClass} value={travel} onChange={event => filter(setTravel)(event.target.value)}>
                <option value="">Tous</option>
                <option value="OUI">Viendra à Niamey</option>
                <option value="NON">Ne viendra pas</option>
              </select>
            </FilterField>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {visible.length} sur {rows.length} participant{rows.length > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser les filtres
              </Button>
            )}
            <Button type="button" variant="outline" className="h-9" disabled={isExporting || visible.length === 0} onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          {visible.length} participant{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Participant</th>
                <th className="px-4 py-2.5">Région</th>
                <th className="px-4 py-2.5">N° badge</th>
                <th className="px-4 py-2.5">Présence</th>
                <th className="px-4 py-2.5">Premier pointage</th>
                <th className="px-4 py-2.5 text-right">Pointages</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageRows.map(row => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.gender}
                      {row.gender && row.phone ? " · " : ""}
                      {row.phone}
                      {row.profession ? ` · ${row.profession}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {row.region}
                    {row.travel === "NON" && <span className="block text-xs text-red-600">Ne viendra pas à Niamey</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.badgeNumber}</td>
                  <td className="px-4 py-3">
                    {row.firstCheckIn ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Présent</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Pas encore pointé
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.firstCheckIn ? new Date(row.firstCheckIn).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.checkIns}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun participant pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <ListPagination
          page={currentPage}
          pageSize={pageSize}
          total={visible.length}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
