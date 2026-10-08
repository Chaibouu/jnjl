"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Check,
  LifeBuoy,
  X,
  Clock,
  Send,
  AlertCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  User,
  ShieldCheck,
  FileText,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import {
  decideRepechageAction,
  getRepechageCandidatesAction,
  requestRepechageAction,
  cancelRepechageRequestAction,
} from "@/actions/repechage-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RepechageStats } from "./RepechageStats";
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };
type CurrentUser = { id: string; name: string | null; role: string } | null;

export type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  quizScore: number | null;
  rank: number | null;
  region: { id: string; name: string; code: string };
  repechage: {
    status: string; // "EN_ATTENTE" | "VALIDE" | "REFUSE"
    justification: string;
    decisionComment?: string | null;
    createdAt: Date | string;
    updatedAt?: Date | string;
    decidedAt?: Date | string | null;
    requestedBy?: { id: string; name: string | null; role: string } | null;
    decidedBy?: { id: string; name: string | null; role: string } | null;
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  VALIDE: "Repêché",
  REFUSE: "Refusé",
  EN_ATTENTE: "En attente de validation",
};

export function RepechageManager({
  editions,
  initialEditionId,
  initialCandidates,
  currentUser,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialCandidates: Candidate[];
  currentUser?: CurrentUser;
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<string>("eligible"); // "eligible" | "pending" | "direct" | "decided"
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Modales
  const [staffDialogTarget, setStaffDialogTarget] = useState<Candidate | null>(null);
  const [adminDialogTarget, setAdminDialogTarget] = useState<{
    candidate: Candidate;
    decision: "VALIDE" | "REFUSE";
    isFromStaffRequest: boolean;
  } | null>(null);
  const [cancelDialogTarget, setCancelDialogTarget] = useState<Candidate | null>(null);

  const [isPending, startTransition] = useTransition();

  const isStaff = currentUser?.role === "STAFF";
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

  const refresh = (newEditionId: string) => {
    setError("");
    startTransition(async () => {
      try {
        const updated = await getRepechageCandidatesAction(newEditionId);
        setCandidates(updated as unknown as Candidate[]);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  const changeEdition = (value: string | null) => {
    if (!value) return;
    setEditionId(value);
    setMessage("");
    refresh(value);
  };

  // Liste des régions présentes dans les données pour le filtre
  const regions = useMemo(() => {
    const map = new Map<string, string>();
    candidates.forEach(c => {
      if (c.region) map.set(c.region.id, c.region.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [candidates]);

  // Filtrage combiné : recherche textuelle + région
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchRegion =
        selectedRegion === "ALL" || candidate.region.id === selectedRegion;
      const search = searchQuery.toLowerCase().trim();
      const matchSearch =
        !search ||
        candidate.firstName.toLowerCase().includes(search) ||
        candidate.lastName.toLowerCase().includes(search) ||
        candidate.email.toLowerCase().includes(search);
      return matchRegion && matchSearch;
    });
  }, [candidates, selectedRegion, searchQuery]);

  // Catégories
  const pendingRequests = useMemo(
    () => filteredCandidates.filter(c => c.repechage?.status === "EN_ATTENTE"),
    [filteredCandidates]
  );
  const noRequestCandidates = useMemo(
    () => filteredCandidates.filter(c => !c.repechage),
    [filteredCandidates]
  );
  const eligibleCandidates = useMemo(
    () => filteredCandidates.filter(c => !c.repechage || c.repechage.status === "EN_ATTENTE"),
    [filteredCandidates]
  );
  const decidedCandidates = useMemo(
    () =>
      filteredCandidates.filter(
        c => c.repechage && (c.repechage.status === "VALIDE" || c.repechage.status === "REFUSE")
      ),
    [filteredCandidates]
  );

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white"
              style={{ backgroundColor: charter.orange }}
            >
              {isStaff ? (
                <>
                  <User className="h-3.5 w-3.5" /> Espace Staff
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> Administration
                </>
              )}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Module Ambassadeurs
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isStaff ? "Demandes de Repêchage" : "Gestion des Repêchages"}
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {isStaff
                  ? "En tant que staff / point focal, vous pouvez soumettre une demande de repêchage motivée pour un candidat non sélectionné. Votre demande sera examinée et validée par les administrateurs."
                  : "Validez ou refusez les demandes de repêchage soumises par les staffs régionaux, ou repêchez directement un candidat non sélectionné."}
              </p>
            </div>

            {isStaff && (
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                render={<Link href="/admin/repechage/guide" />}
                className="shrink-0 rounded-xl border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
              >
                <HelpCircle className="mr-1.5 h-4 w-4" />
                Guide du repêchage
              </Button>
            )}
          </div>
        </div>

        {/* Sélecteur d'édition */}
        <div className="w-full sm:w-64">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Édition active
          </label>
          <Select value={editionId} onValueChange={changeEdition}>
            <SelectTrigger className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3.5 text-sm font-medium">
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
        </div>
      </header>

      {/* Messages d'alerte / succès */}
      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm text-green-700 shadow-sm dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-destructive shadow-sm dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Statistiques rapides */}
      <RepechageStats 
        candidates={filteredCandidates} 
        currentUser={currentUser ?? null}
      />

      {/* Barre de filtres et recherche */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, prénom ou email..."
            className="pl-9 rounded-xl border-border bg-muted/30"
          />
        </div>

        {regions.length > 1 && (
          <div className="w-full sm:w-56">
            <Select value={selectedRegion} onValueChange={v => v && setSelectedRegion(v)}>
              <SelectTrigger className="rounded-xl border-border bg-muted/30 text-sm">
                <SelectValue placeholder="Toutes les régions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les régions ({regions.length})</SelectItem>
                {regions.map(reg => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {reg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Onglets de navigation */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {isStaff ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("eligible")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "eligible"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <LifeBuoy className="h-4 w-4" />
              <span>Candidats éligibles</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                {eligibleCandidates.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("decided")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "decided"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Décisions de l'Administration</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                {decidedCandidates.length}
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "pending" || activeTab === "eligible"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Demandes des staffs en attente</span>
              {pendingRequests.length > 0 ? (
                <span className="rounded-full bg-amber-400 text-amber-950 px-2 py-0.5 text-xs font-bold animate-pulse">
                  {pendingRequests.length}
                </span>
              ) : (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">0</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("direct")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "direct"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <LifeBuoy className="h-4 w-4" />
              <span>Repêchage direct ({noRequestCandidates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("decided")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "decided"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Décisions prises ({decidedCandidates.length})</span>
            </button>
          </>
        )}
      </div>

      {/* Contenu selon l'onglet actif et le rôle */}

      {/* ─── VUE STAFF : Candidats éligibles ───────────────────────────────────── */}
      {isStaff && activeTab === "eligible" && (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Candidats non sélectionnés</h2>
            <p className="text-sm text-muted-foreground">
              {eligibleCandidates.length} candidat{eligibleCandidates.length !== 1 ? "s" : ""} dans votre périmètre.
              Cliquez sur « Demander un repêchage » pour formuler une demande motivée.
            </p>
          </div>

          <div className="divide-y">
            {eligibleCandidates.map(candidate => {
              const hasPendingRequest = candidate.repechage?.status === "EN_ATTENTE";
              const isMyRequest = candidate.repechage?.requestedBy?.id === currentUser?.id;

              return (
                <div key={candidate.id} className="p-5 transition-colors hover:bg-muted/20">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-base">
                          {candidate.firstName} {candidate.lastName}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                          {candidate.region.name}
                        </span>
                        {candidate.rank && (
                          <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Rang {candidate.rank}
                          </span>
                        )}
                        {candidate.quizScore != null && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                            Score : {candidate.quizScore.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{candidate.email}</p>
                    </div>

                    {/* Actions pour le Staff */}
                    <div>
                      {!hasPendingRequest ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => setStaffDialogTarget(candidate)}
                          className="rounded-xl border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                        >
                          <Send className="mr-1.5 h-4 w-4" />
                          Demander un repêchage
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            <Clock className="h-3.5 w-3.5" />
                            Demande en attente de validation
                          </span>
                          {isMyRequest && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isPending}
                              onClick={() => setCancelDialogTarget(candidate)}
                              className="text-xs text-muted-foreground hover:text-destructive"
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              Annuler
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Motif de la demande si en attente */}
                  {hasPendingRequest && (
                    <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                      <p className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <FileText className="h-3.5 w-3.5" />
                        Motif transmis aux administrateurs :
                      </p>
                      <p className="mt-1 italic">&laquo; {candidate.repechage?.justification} &raquo;</p>
                      <p className="mt-1.5 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                        Soumis par {candidate.repechage?.requestedBy?.name ?? "un membre du staff"} le{" "}
                        {candidate.repechage?.createdAt &&
                          new Date(candidate.repechage.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {eligibleCandidates.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <LifeBuoy className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p>Aucun candidat non sélectionné trouvé pour cette édition ou ce filtre.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VUE ADMIN : Demandes de staff en attente ─────────────────────────── */}
      {!isStaff && (activeTab === "pending" || activeTab === "eligible") && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b p-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Demandes de repêchage soumises par les staffs
                </h2>
                <p className="text-sm text-muted-foreground">
                  Examinez les motifs transmis par les points focaux régionaux et validez ou refusez.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {pendingRequests.length} en attente
              </span>
            </div>

            <div className="divide-y">
              {pendingRequests.map(candidate => (
                <div key={candidate.id} className="p-5 transition-colors hover:bg-muted/10">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-base">
                          {candidate.firstName} {candidate.lastName}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                          {candidate.region.name}
                        </span>
                        {candidate.rank && (
                          <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Rang {candidate.rank}
                          </span>
                        )}
                        {candidate.quizScore != null && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                            Score : {candidate.quizScore.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{candidate.email}</p>
                    </div>

                    {/* Actions Administrateur sur la demande du staff */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          setAdminDialogTarget({
                            candidate,
                            decision: "VALIDE",
                            isFromStaffRequest: true,
                          })
                        }
                        className="rounded-xl border-green-300 bg-green-50 text-green-700 hover:border-green-500 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        Valider la demande
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          setAdminDialogTarget({
                            candidate,
                            decision: "REFUSE",
                            isFromStaffRequest: true,
                          })
                        }
                        className="rounded-xl border-red-300 bg-red-50 text-red-700 hover:border-red-500 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Refuser
                      </Button>
                    </div>
                  </div>

                  {/* Motif explicatif du Staff */}
                  <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                        <User className="h-3.5 w-3.5" />
                        Demandé par : {candidate.repechage?.requestedBy?.name ?? "Membre du Staff"}
                      </p>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400">
                        {candidate.repechage?.createdAt &&
                          new Date(candidate.repechage.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </span>
                    </div>
                    <div className="mt-2 rounded-lg bg-white/70 p-2.5 text-xs text-foreground italic shadow-sm dark:bg-black/30">
                      &laquo; {candidate.repechage?.justification} &raquo;
                    </div>
                  </div>
                </div>
              ))}

              {pendingRequests.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-green-500/70 mb-2" />
                  <p className="font-medium text-foreground">Aucune demande en attente</p>
                  <p className="text-xs mt-1">
                    Toutes les demandes de repêchage soumises par les staffs ont été traitées.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── VUE ADMIN : Repêchage direct (Sans demande préalable) ─────────────── */}
      {!isStaff && activeTab === "direct" && (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Repêchage direct</h2>
            <p className="text-sm text-muted-foreground">
              {noRequestCandidates.length} candidat{noRequestCandidates.length !== 1 ? "s" : ""} non sélectionné{noRequestCandidates.length !== 1 ? "s" : ""} sans demande de staff en cours.
              En tant qu'administrateur, vous pouvez repêcher ou refuser directement avec justification.
            </p>
          </div>

          <div className="divide-y">
            {noRequestCandidates.map(candidate => (
              <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:bg-muted/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-base">
                      {candidate.firstName} {candidate.lastName}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {candidate.region.name}
                    </span>
                    {candidate.rank && (
                      <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Rang {candidate.rank}
                      </span>
                    )}
                    {candidate.quizScore != null && (
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                        Score : {candidate.quizScore.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{candidate.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      setAdminDialogTarget({
                        candidate,
                        decision: "VALIDE",
                        isFromStaffRequest: false,
                      })
                    }
                    className="rounded-xl border-green-300 bg-green-50 text-green-700 hover:border-green-500 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
                  >
                    <LifeBuoy className="mr-1.5 h-4 w-4" />
                    Repêcher directement
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      setAdminDialogTarget({
                        candidate,
                        decision: "REFUSE",
                        isFromStaffRequest: false,
                      })
                    }
                    className="rounded-xl border-red-300 bg-red-50 text-red-700 hover:border-red-500 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Refuser
                  </Button>
                </div>
              </div>
            ))}

            {noRequestCandidates.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <LifeBuoy className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p>Aucun candidat sans demande trouvé.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── HISTORIQUE DES DÉCISIONS (Accessible à tous) ─────────────────────── */}
      {activeTab === "decided" && (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Décisions enregistrées</h2>
            <p className="text-sm text-muted-foreground">
              Traçabilité complète des repêchages accordés et refusés.
            </p>
          </div>

          <div className="divide-y">
            {decidedCandidates.map(candidate => {
              const isAccepted = candidate.repechage?.status === "VALIDE";

              return (
                <div key={candidate.id} className="p-5 transition-colors hover:bg-muted/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-base">
                        {candidate.firstName} {candidate.lastName}
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {candidate.region.name}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        isAccepted
                          ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      }`}
                    >
                      {isAccepted ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {STATUS_LABEL[candidate.repechage?.status ?? ""] ?? candidate.repechage?.status}
                    </span>
                  </div>

                  {/* Motif de la demande et justification de l'admin */}
                  <div className="mt-2.5 space-y-1.5 text-sm">
                    {candidate.repechage?.justification && (
                      <p className="text-muted-foreground text-xs">
                        <span className="font-medium text-foreground">Motif : </span>
                        {candidate.repechage.justification}
                      </p>
                    )}

                    {candidate.repechage?.decisionComment && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Remarque administrateur : </span>
                        {candidate.repechage.decisionComment}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground border-t pt-2.5">
                    {candidate.repechage?.requestedBy && (
                      <p>
                        Demandé par :{" "}
                        <span className="font-medium text-foreground">
                          {candidate.repechage.requestedBy.name ?? "Staff"}
                        </span>
                      </p>
                    )}
                    <p>
                      Décidé par :{" "}
                      <span className="font-medium text-foreground">
                        {candidate.repechage?.decidedBy?.name ?? "Administration"}
                      </span>
                      {candidate.repechage?.decidedAt &&
                        ` le ${new Date(candidate.repechage.decidedAt).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                </div>
              );
            })}

            {decidedCandidates.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p>Aucune décision prise pour le moment.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODALE STAFF : Demande de repêchage ───────────────────────────────── */}
      <StaffRequestDialog
        candidate={staffDialogTarget}
        onClose={() => setStaffDialogTarget(null)}
        onSuccess={appId => {
          setStaffDialogTarget(null);
          setMessage("Demande de repêchage soumise avec succès aux administrateurs");
          refresh(editionId);
        }}
      />

      {/* ─── MODALE ADMIN : Prise de décision / validation ─────────────────────── */}
      <AdminDecisionDialog
        target={adminDialogTarget}
        onClose={() => setAdminDialogTarget(null)}
        onSuccess={() => {
          const actionText =
            adminDialogTarget?.decision === "VALIDE"
              ? "Candidat repêché avec succès"
              : "Repêchage refusé";
          setAdminDialogTarget(null);
          setMessage(actionText);
          refresh(editionId);
        }}
      />

      {/* ─── MODALE ANNULATION DEMANDE STAFF ─────────────────────────────────── */}
      <CancelRequestDialog
        candidate={cancelDialogTarget}
        onClose={() => setCancelDialogTarget(null)}
        onSuccess={() => {
          setCancelDialogTarget(null);
          setMessage("Demande de repêchage annulée");
          refresh(editionId);
        }}
      />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODALE STAFF : Formuler une demande de repêchage avec motif
───────────────────────────────────────────────────────────────────────────── */
function StaffRequestDialog({
  candidate,
  onClose,
  onSuccess,
}: {
  candidate: Candidate | null;
  onClose: () => void;
  onSuccess: (candidateId: string) => void;
}) {
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!candidate) return;
    setError("");

    startTransition(async () => {
      try {
        await requestRepechageAction(candidate.id, motif);
        setMotif("");
        onSuccess(candidate.id);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <Dialog
      open={!!candidate}
      onOpenChange={open => {
        if (!open) {
          setMotif("");
          setError("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <LifeBuoy className="h-5 w-5 text-amber-600" />
            Demande de repêchage
          </DialogTitle>
        </DialogHeader>

        {candidate && (
          <div className="rounded-xl border border-muted bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm">
              {candidate.firstName} {candidate.lastName}
            </p>
            <p>
              Région : <span className="font-medium text-foreground">{candidate.region.name}</span> ·
              Rang : <span className="font-medium text-foreground">{candidate.rank ?? "—"}</span> ·
              Score QCM :{" "}
              <span className="font-medium text-foreground">
                {candidate.quizScore != null ? `${candidate.quizScore.toFixed(0)}%` : "—"}
              </span>
            </p>
          </div>
        )}

        <form id="staff-repechage-form" onSubmit={submit} className="space-y-4">
          <Field>
            <FieldLabel className="text-sm font-semibold">
              Motif de la demande de repêchage <span className="text-destructive">*</span>
            </FieldLabel>
            <p className="text-xs text-muted-foreground mb-1.5">
              Expliquez pourquoi ce candidat mérite d'être repêché à titre exceptionnel (engagement local, représentativité, compétences, motivation particulière, etc.). Ce motif sera soumis aux administrateurs.
            </p>
            <Textarea
              value={motif}
              onChange={event => setMotif(event.target.value)}
              required
              minLength={10}
              placeholder="Saisissez un motif clair et détaillé (minimum 10 caractères)..."
              className="min-h-[120px] rounded-xl border border-border bg-muted/30 p-3 text-sm focus-visible:ring-2 focus-visible:ring-primary"
            />
          </Field>

          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Annuler
          </Button>
          <Button
            type="submit"
            form="staff-repechage-form"
            loading={isPending}
            disabled={motif.trim().length < 10}
            className="rounded-xl text-white shadow-sm"
            style={{ backgroundColor: charter.orange }}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {isPending ? "Transmission..." : "Soumettre aux Administrateurs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODALE ADMIN : Validation ou Refus de repêchage (demande staff ou direct)
───────────────────────────────────────────────────────────────────────────── */
function AdminDecisionDialog({
  target,
  onClose,
  onSuccess,
}: {
  target: {
    candidate: Candidate;
    decision: "VALIDE" | "REFUSE";
    isFromStaffRequest: boolean;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isAccept = target?.decision === "VALIDE";
  const isDirect = !target?.isFromStaffRequest;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) return;
    setError("");

    startTransition(async () => {
      try {
        await decideRepechageAction(target.candidate.id, target.decision, justification);
        setJustification("");
        onSuccess();
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <Dialog
      open={!!target}
      onOpenChange={open => {
        if (!open) {
          setJustification("");
          setError("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {isAccept ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <X className="h-5 w-5 text-red-600" />
            )}
            {isAccept
              ? target?.isFromStaffRequest
                ? "Valider le repêchage (Demande du Staff)"
                : "Repêcher directement le candidat"
              : target?.isFromStaffRequest
              ? "Rejeter la demande de repêchage"
              : "Refuser le repêchage"}
          </DialogTitle>
        </DialogHeader>

        {target && (
          <div className="space-y-3">
            <div className="rounded-xl border border-muted bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-sm">
                {target.candidate.firstName} {target.candidate.lastName}
              </p>
              <p>
                Région : <span className="font-medium text-foreground">{target.candidate.region.name}</span> ·
                Rang : <span className="font-medium text-foreground">{target.candidate.rank ?? "—"}</span> ·
                Score QCM :{" "}
                <span className="font-medium text-foreground">
                  {target.candidate.quizScore != null ? `${target.candidate.quizScore.toFixed(0)}%` : "—"}
                </span>
              </p>
            </div>

            {/* Rappel du motif du staff si existant */}
            {target.candidate.repechage?.justification && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Motif soumis par {target.candidate.repechage.requestedBy?.name ?? "le Staff"} :
                </p>
                <p className="mt-1 italic">&laquo; {target.candidate.repechage.justification} &raquo;</p>
              </div>
            )}
          </div>
        )}

        <form id="admin-repechage-decision-form" onSubmit={submit} className="space-y-4">
          <Field>
            <FieldLabel className="text-sm font-semibold">
              {isDirect
                ? "Justification de la décision *"
                : isAccept
                ? "Commentaire ou note administrative (optionnel)"
                : "Motif du refus (optionnel)"}
            </FieldLabel>
            <Textarea
              value={justification}
              onChange={event => setJustification(event.target.value)}
              required={isDirect}
              minLength={isDirect ? 10 : 0}
              placeholder={
                isDirect
                  ? "Saisissez la justification du repêchage (obligatoire, min. 10 caractères)..."
                  : "Ajoutez une remarque interne ou un commentaire..."
              }
              className="min-h-[100px] rounded-xl border border-border bg-muted/30 p-3 text-sm focus-visible:ring-2 focus-visible:ring-primary"
            />
          </Field>

          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Annuler
          </Button>
          <Button
            type="submit"
            form="admin-repechage-decision-form"
            loading={isPending}
            disabled={isDirect && justification.trim().length < 10}
            className={`rounded-xl text-white shadow-sm ${
              isAccept ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isPending
              ? "Enregistrement..."
              : isAccept
              ? "Confirmer le repêchage"
              : "Confirmer le refus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODALE STAFF : Annuler une demande en attente
───────────────────────────────────────────────────────────────────────────── */
function CancelRequestDialog({
  candidate,
  onClose,
  onSuccess,
}: {
  candidate: Candidate | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    if (!candidate) return;
    setError("");

    startTransition(async () => {
      try {
        await cancelRepechageRequestAction(candidate.id);
        onSuccess();
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <Dialog open={!!candidate} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            Annuler la demande de repêchage
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Êtes-vous sûr de vouloir annuler votre demande de repêchage pour{" "}
          <span className="font-semibold text-foreground">
            {candidate?.firstName} {candidate?.lastName}
          </span>{" "}
          ? Le candidat redevient disponible pour une éventuelle autre demande.
        </p>

        {error && (
          <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Conserver la demande
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={isPending}
            onClick={confirm}
            className="rounded-xl"
          >
            Confirmer l'annulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
