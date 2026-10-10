"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  generateAccessAction,
  generateAccessBatchAction,
  getAccessOverviewAction,
  syncEmailStatusesAction,
  type AccessMailState,
  type AccessOverview,
  type AccessRow,
  type IssuedAccess,
} from "@/actions/access-management-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import charter from "@/settings/charter";

const STAGE_LABEL: Record<string, string> = {
  CANDIDATURE: "Candidature",
  PAIEMENT: "Paiement",
  FORMATION: "Formation",
  QCM: "QCM",
  CLASSEMENT: "Classement",
  SELECTION: "Sélection",
  REPECHAGE: "Repêchage",
  DOCUMENTS: "Documents",
  ENGAGEMENT: "Engagement",
  BADGE: "Badge",
  EMBARQUEMENT: "Embarquement",
  PRESENCE: "Présence",
  ATTESTATION: "Attestation",
};

const MAIL_BADGE: Record<AccessMailState | "NONE", { label: string; className: string }> = {
  NONE: { label: "Aucun e-mail trouvé", className: "bg-orange-100 text-orange-700" },
  ACCEPTED: { label: "En vérification", className: "bg-amber-100 text-amber-700" },
  DELIVERED: { label: "E-mail livré", className: "bg-green-100 text-green-700" },
  MANUAL: { label: "Remis manuellement", className: "bg-blue-100 text-blue-700" },
  FAILED: { label: "E-mail en échec", className: "bg-red-100 text-red-700" },
  BOUNCED: { label: "Adresse refusée", className: "bg-red-100 text-red-700" },
  COMPLAINED: { label: "Signalé comme spam", className: "bg-red-100 text-red-700" },
};

/**
 * Trois groupes, du plus urgent au plus rassurant :
 *  - TODO : aucun e-mail d'accès trouvé, ou e-mail en échec / refusé / signalé → il faut agir ;
 *  - CHECKING : e-mail accepté par le service d'envoi, livraison pas encore confirmée → rien à faire ;
 *  - DONE : e-mail livré ou accès remis à la main.
 */
type Group = "TODO" | "CHECKING" | "DONE";
const groupOf = (row: AccessRow): Group => {
  if (!row.mail) return "TODO";
  if (["FAILED", "BOUNCED", "COMPLAINED"].includes(row.mail.status)) return "TODO";
  return row.mail.status === "ACCEPTED" ? "CHECKING" : "DONE";
};

type Filter = "ALL" | Group;

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const field = document.createElement("textarea");
    field.value = value;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    document.body.removeChild(field);
  }
}

export function AccessManager({ initial }: { initial: AccessOverview }) {
  const [overview, setOverview] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("TODO");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendEmail, setSendEmail] = useState(false);
  const [confirm, setConfirm] = useState<{ rows: AccessRow[]; mode: "email" | "manual" } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<{ sent: number; notProcessed: number } | null>(null);
  const [issued, setIssued] = useState<IssuedAccess[] | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [syncRead, setSyncRead] = useState(0);
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(async () => setOverview(await getAccessOverviewAction()), []);

  /**
   * Synchronise l'état des e-mails avec l'historique du fournisseur, page après page, jusqu'à la fin, puis
   * recharge la liste. Se lance seule à l'ouverture de la page.
   */
  const refreshStatuses = useCallback(
    async (silent: boolean) => {
      setChecking(true);
      setSyncRead(0);
      if (!silent) {
        setMessage("");
        setError("");
      }
      try {
        let cursor: string | null = null;
        let totalRead = 0;
        let calls = 0;
        do {
          const result = await syncEmailStatusesAction(cursor);
          if (!result.ok) {
            if (!silent) setError(result.error);
            break;
          }
          totalRead += result.read;
          setSyncRead(totalRead);
          cursor = result.next;
          calls += 1;
        } while (cursor && calls < 15); // 15 appels × 3 pages × 100 envois = 4 500 e-mails au plus
        await reload();
        if (!silent) setMessage(`L'état des e-mails est à jour (${totalRead} e-mails vérifiés chez le fournisseur).`);
      } catch {
        if (!silent) setError("La vérification a échoué. Réessayez dans un instant.");
      } finally {
        setChecking(false);
      }
    },
    [reload]
  );

  // À l'ouverture : on récupère l'état réel des envois (livré / échoué), inconnu au moment de l'envoi.
  useEffect(() => {
    void refreshStatuses(true);
  }, [refreshStatuses]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return overview.rows.filter(row => {
      if (filter !== "ALL" && groupOf(row) !== filter) return false;
      return !query || `${row.fullName} ${row.email} ${row.phone} ${row.region}`.toLowerCase().includes(query);
    });
  }, [overview.rows, search, filter]);

  const group = (name: Group) => overview.rows.filter(row => groupOf(row) === name).length;
  const todoCount = group("TODO");
  const checkingCount = group("CHECKING");
  const doneCount = group("DONE");
  const neverCount = overview.rows.filter(row => !row.mail).length;
  const problemCount = todoCount - neverCount;
  // E-mails à renvoyer : ceux qui ont échoué et ceux qui n'ont jamais été envoyés. Pas les adresses refusées ni les
  // signalements de spam : un nouvel envoi échouerait de nouveau (ou aggraverait la situation) ; ces personnes se
  // contactent à la main. Les envois « en vérification » ne sont jamais concernés : leur e-mail est probablement arrivé.
  const failedRows = overview.rows.filter(row => !row.mail || row.mail.status === "FAILED");
  const allSelected = rows.length > 0 && rows.every(row => selected.has(row.id));

  const toggle = (id: string) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set([...selected, ...rows.map(row => row.id)]));

  const run = () => {
    if (!confirm) return;
    const ids = confirm.rows.map(row => row.id);
    const viaEmail = confirm.mode === "email" || sendEmail;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        // Par petits lots quand des e-mails partent : le fournisseur limite le débit et la durée d'un appel est bornée.
        const size = viaEmail ? 5 : 40;
        const all: Awaited<ReturnType<typeof generateAccessAction>>[] = [];
        let notProcessed = 0;
        setProgress({ done: 0, total: ids.length });

        for (let start = 0; start < ids.length; start += size) {
          const chunk = ids.slice(start, start + size);
          let part: typeof all;
          if (chunk.length === 1) {
            part = [await generateAccessAction(chunk[0], viaEmail)];
          } else {
            const batch = await generateAccessBatchAction(chunk, viaEmail);
            if (!batch.ok) throw new Error(batch.error);
            part = batch.results;
          }
          all.push(...part);
          setProgress({ done: Math.min(start + size, ids.length), total: ids.length });

          // Quota atteint : les suivants échoueraient de la même façon (et leur mot de passe changerait pour rien).
          const quotaReached = part.some(
            result => result.ok && result.access.emailResult === "failed" && /Limite d'envoi/.test(result.access.emailError ?? "")
          );
          if (viaEmail && quotaReached) {
            notProcessed = Math.max(0, ids.length - (start + size));
            break;
          }
        }

        const oks = all.flatMap(result => (result.ok ? [result.access] : []));
        const sent = oks.filter(access => access.emailResult === "sent").length;
        // On n'affiche en détail que ce qu'il faut remettre à la main (e-mail non parti ou non demandé).
        const handOver = confirm.mode === "manual" ? oks : oks.filter(access => access.emailResult !== "sent");
        setIssued(handOver);
        setFailures(all.flatMap(result => (result.ok ? [] : [`${rowName(result.applicationId)} : ${result.error}`])));
        setReport(confirm.mode === "email" ? { sent, notProcessed } : null);
        setConfirm(null);
        setSelected(new Set());
        await reload();
        if (confirm.mode === "email" && oks.every(access => access.emailResult === "sent") && all.every(result => result.ok)) {
          setIssued(null);
          setMessage(`${sent} e-mail(s) envoyé(s). L'état de livraison se met à jour avec « Actualiser l'état des e-mails ».`);
        } else {
          setIssued(current => current ?? []);
        }
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
        setConfirm(null);
      } finally {
        setProgress(null);
      }
    });
  };

  const rowName = (id: string) => overview.rows.find(row => row.id === id)?.fullName ?? "Ambassadeur";

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Ambassadeurs · Super Admin</p>
        <h1 className="mt-1 text-3xl font-bold">Accès des ambassadeurs</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Suivez qui a bien reçu ses accès par e-mail, et remettez-les autrement (WhatsApp, SMS, appel) quand
          l&apos;e-mail n&apos;est pas parti. Un nouveau mot de passe provisoire est généré à chaque remise : l&apos;ancien
          cesse de fonctionner.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Stat label="E-mails envoyés aujourd'hui" value={overview.today.sent} />
          <Stat label="En échec aujourd'hui" value={overview.today.failed} danger={overview.today.failed > 0} />
          <Stat label="Accès à traiter" value={todoCount} danger={todoCount > 0} />
          <Stat label="En vérification" value={checkingCount} />
          <Button
            type="button"
            variant="outline"
            onClick={() => refreshStatuses(false)}
            disabled={checking}
            className="ml-auto rounded-none"
          >
            {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualiser l&apos;état des e-mails
          </Button>
          <Button
            type="button"
            disabled={failedRows.length === 0 || isPending || checking}
            title={checking ? "Attendez la fin de la vérification" : undefined}
            onClick={() => setConfirm({ rows: failedRows, mode: "email" })}
            className="rounded-none text-white"
            style={{ backgroundColor: charter.orange }}
          >
            <Mail className="mr-2 h-4 w-4" />
            Renvoyer les e-mails manquants ({failedRows.length})
          </Button>
        </div>

        {checking ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            Vérification auprès du service d&apos;e-mails en cours{syncRead > 0 ? ` (${syncRead} e-mails lus)` : ""}… Les chiffres se
            mettent à jour à la fin.
          </p>
        ) : (
          <p className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
            Bilan : <strong className="text-green-700">{doneCount} reçus</strong> ·{" "}
            <strong className="text-amber-700">{checkingCount} en vérification</strong> ·{" "}
            <strong className="text-red-700">{problemCount} en échec ou refusés</strong> ·{" "}
            <strong className="text-orange-700">{neverCount} sans e-mail d&apos;accès</strong>
          </p>
        )}

        {overview.today.failed > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Des e-mails n&apos;ont pas pu être livrés aujourd&apos;hui. Le plus souvent, la limite d&apos;envoi du plan gratuit du
            service d&apos;e-mails est atteinte : le détail se lit dans le tableau de bord du fournisseur (Emails › l&apos;envoi en
            échec). En attendant, remettez les accès à la main depuis cette page.
          </p>
        )}
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["TODO", `À traiter (${todoCount})`],
                ["CHECKING", `En vérification (${checkingCount})`],
                ["DONE", `Reçus (${doneCount})`],
                ["ALL", "Tous"],
              ] as const
            ).map(([code, label]) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant={filter === code ? "default" : "outline"}
                onClick={() => setFilter(code)}
                className="rounded-none"
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un nom, une adresse, un numéro…"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b bg-primary/5 px-5 py-3 text-sm">
            <span className="font-medium">{selected.size} sélectionné(s)</span>
            <Button
              type="button"
              size="sm"
              className="rounded-none text-white"
              style={{ backgroundColor: charter.orange }}
              onClick={() => setConfirm({ rows: overview.rows.filter(row => selected.has(row.id)), mode: "email" })}
            >
              <Mail className="mr-2 h-4 w-4" />
              Renvoyer par e-mail
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-none"
              onClick={() => setConfirm({ rows: overview.rows.filter(row => selected.has(row.id)), mode: "manual" })}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Remettre à la main
            </Button>
            <button type="button" className="text-muted-foreground underline" onClick={() => setSelected(new Set())}>
              Tout désélectionner
            </button>
          </div>
        )}
        {message && <p className="border-b px-5 py-3 text-sm text-green-600">{message}</p>}
        {error && <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-12 px-5 py-4">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
                </th>
                <th className="px-5 py-4">Ambassadeur</th>
                <th className="px-5 py-4">Région</th>
                <th className="px-5 py-4">Étape</th>
                <th className="px-5 py-4">E-mail d&apos;accès</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(row => {
                const badge = MAIL_BADGE[row.mail?.status ?? "NONE"];
                return (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggle(row.id)}
                        aria-label={`Sélectionner ${row.fullName}`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{row.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.email} · {row.phone}
                      </p>
                    </td>
                    <td className="px-5 py-4">{row.region}</td>
                    <td className="px-5 py-4">{STAGE_LABEL[row.stage] ?? row.stage}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                      {row.mail && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(row.mail.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={row.mail && ["FAILED", "BOUNCED", "COMPLAINED"].includes(row.mail.status) ? "default" : "outline"}
                          className="rounded-none"
                          onClick={() => setConfirm({ rows: [row], mode: "email" })}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Renvoyer l&apos;e-mail
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-none"
                          onClick={() => setConfirm({ rows: [row], mode: "manual" })}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          À la main
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    {filter === "TODO" ? "Rien à traiter : tous les accès sont reçus ou en cours de vérification." : "Aucun ambassadeur dans cette liste."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation avant génération / renvoi */}
      <Dialog open={confirm !== null} onOpenChange={open => !open && !isPending && setConfirm(null)}>
        <DialogContent className="rounded-none sm:max-w-lg">
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {confirm.mode === "email"
                    ? confirm.rows.length > 1
                      ? `Renvoyer ${confirm.rows.length} e-mails ?`
                      : "Renvoyer l'e-mail ?"
                    : confirm.rows.length > 1
                      ? `Générer ${confirm.rows.length} accès ?`
                      : "Remettre l'accès à la main ?"}
                </DialogTitle>
                <DialogDescription>
                  {confirm.mode === "email"
                    ? "Un nouveau mot de passe provisoire est généré et envoyé par e-mail. L'ancien cesse de fonctionner et les sessions ouvertes sont fermées. Si l'e-mail échoue de nouveau, le mot de passe s'affiche ici pour que vous le remettiez à la main."
                    : "Un nouveau mot de passe provisoire est généré et affiché ici, une seule fois. L'ancien cesse de fonctionner et les sessions ouvertes sont fermées."}
                </DialogDescription>
              </DialogHeader>

              {confirm.rows.length <= 6 ? (
                <ul className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
                  {confirm.rows.map(row => (
                    <li key={row.id}>
                      <span className="font-medium">{row.fullName}</span>{" "}
                      <span className="text-muted-foreground">· {row.email}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg bg-muted/40 p-3 text-sm">
                  {confirm.rows.length} ambassadeurs concernés, du plus récent au plus ancien.
                </p>
              )}

              {confirm.mode === "email" ? (
                <p className="text-xs text-muted-foreground">
                  E-mails déjà envoyés aujourd&apos;hui : <strong>{overview.today.sent}</strong> (dont{" "}
                  <strong>{overview.today.failed}</strong> en échec). Si la limite du plan gratuit est atteinte, l&apos;envoi
                  s&apos;arrête de lui-même et les autres restent inchangés.
                </p>
              ) : (
                <label className="flex items-start gap-2.5 text-sm">
                  <Checkbox className="mt-0.5" checked={sendEmail} onCheckedChange={value => setSendEmail(Boolean(value))} />
                  <span>
                    Envoyer aussi l&apos;accès par e-mail
                    <span className="block text-xs text-muted-foreground">
                      À éviter si la limite d&apos;envoi est atteinte : l&apos;e-mail échouerait de nouveau.
                    </span>
                  </span>
                </label>
              )}

              {progress && (
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(progress.done / progress.total) * 100}%`, backgroundColor: charter.orange }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progress.done} / {progress.total} traité(s)…
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className="rounded-none" disabled={isPending} onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  className="rounded-none text-white"
                  style={{ backgroundColor: charter.orange }}
                  disabled={isPending}
                  onClick={run}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : confirm.mode === "email" ? (
                    <Mail className="mr-2 h-4 w-4" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  {confirm.mode === "email" ? "Renvoyer" : "Générer"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Résultat : les mots de passe ne sont affichés qu'ici, une seule fois */}
      <Dialog open={issued !== null} onOpenChange={open => !open && (setIssued(null), setFailures([]), setReport(null))}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-none sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {report
                ? "Résultat du renvoi"
                : issued && issued.length > 1
                  ? `${issued.length} accès générés`
                  : "Accès généré"}
            </DialogTitle>
            <DialogDescription>
              {issued && issued.length > 0 ? (
                <>
                  Remettez ces accès à la main. <strong>Les mots de passe ne seront plus affichés</strong> une fois cette
                  fenêtre fermée : copiez-les maintenant.
                </>
              ) : (
                "Aucun accès à remettre à la main."
              )}
            </DialogDescription>
          </DialogHeader>
          {report && (
            <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
              <p>
                <strong>{report.sent}</strong> e-mail(s) envoyé(s) avec succès.
              </p>
              {issued && issued.length > 0 && (
                <p>
                  <strong>{issued.length}</strong> e-mail(s) en échec : leurs accès sont ci-dessous, à remettre à la main.
                </p>
              )}
              {report.notProcessed > 0 && (
                <p className="text-amber-700">
                  La limite d&apos;envoi est atteinte : <strong>{report.notProcessed}</strong> ambassadeur(s) n&apos;ont pas été
                  traités (leur mot de passe n&apos;a pas changé). Relancez après minuit (UTC) ou passez à un plan supérieur.
                </p>
              )}
            </div>
          )}
          {issued && <IssuedList items={issued} />}
          {failures.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {failures.map(failure => (
                <li key={failure}>{failure}</li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Stat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-4 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${danger ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}

function IssuedList({ items }: { items: IssuedAccess[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    await copyText(value);
    setCopied(key);
    setTimeout(() => setCopied(current => (current === key ? null : current)), 2000);
  };

  const downloadCsv = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [
      ["Nom", "Email", "Téléphone", "Mot de passe provisoire"].map(escape).join(";"),
      ...items.map(item => [item.fullName, item.email, item.phone, item.password].map(escape).join(";")),
    ];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "acces-ambassadeurs.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4">
      {items.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={() => copy("all", items.map(item => item.message).join("\n\n————————\n\n"))}
          >
            {copied === "all" ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
            Copier tous les messages
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-none" onClick={downloadCsv}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger en CSV
          </Button>
        </div>
      )}

      {items.map(item => (
        <div key={item.applicationId} className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{item.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {item.email} · {item.phone}
              </p>
            </div>
            {item.emailResult === "sent" && <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700">E-mail envoyé</span>}
            {item.emailResult === "failed" && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-700" title={item.emailError ?? ""}>
                E-mail en échec
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">Mot de passe provisoire</span>
            <code className="font-mono text-base font-bold tracking-wide">{item.password}</code>
            <button
              type="button"
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => copy(`pw-${item.applicationId}`, item.password)}
              aria-label="Copier le mot de passe"
            >
              {copied === `pw-${item.applicationId}` ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <textarea
            readOnly
            value={item.message}
            rows={9}
            className="w-full resize-none rounded-lg border bg-white p-3 text-sm"
            onFocus={event => event.currentTarget.select()}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-none"
              onClick={() => copy(`msg-${item.applicationId}`, item.message)}
            >
              {copied === `msg-${item.applicationId}` ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied === `msg-${item.applicationId}` ? "Message copié" : "Copier le message"}
            </Button>
            {item.whatsappUrl ? (
              <a
                href={item.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-2 bg-[#25D366] px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" />
                Envoyer sur WhatsApp
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">Numéro WhatsApp non reconnu : copiez le message.</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
