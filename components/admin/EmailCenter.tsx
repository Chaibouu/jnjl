"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { AlertTriangle, Eye, Loader2, Mail, Pause, Play, RefreshCw, Send, Trash2, Users } from "lucide-react";
import {
  createCampaignAction,
  deleteCampaignAction,
  getAudienceCountsAction,
  getCampaignDetailAction,
  getEmailCenterAction,
  getRecipientPreviewAction,
  previewCampaignAction,
  retryFailedRecipientsAction,
  saveEmailLimitsAction,
  sendCampaignChunkAction,
  sendTestEmailAction,
  type CampaignSummary,
  type EmailCenter as EmailCenterData,
} from "@/actions/email-campaign-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AUDIENCES, parseEmailList, type Audience } from "@/lib/email-audience-shared";
import charter from "@/settings/charter";

const ALL_REGIONS = "ALL";
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-600" },
  SENDING: { label: "En cours", className: "bg-amber-100 text-amber-700" },
  PAUSED: { label: "En pause", className: "bg-blue-100 text-blue-700" },
  DONE: { label: "Terminée", className: "bg-green-100 text-green-700" },
};

type Run = {
  campaignId: string;
  subject: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  status: string;
  reason: string | null;
  finished: boolean;
};

const audienceLabel = (code: string) => AUDIENCES.find(item => item.code === code)?.label ?? code;

export function EmailCenter({ initial }: { initial: EmailCenterData }) {
  const { confirm } = useConfirm();
  const [center, setCenter] = useState(initial);
  const [counts, setCounts] = useState(initial.counts);
  const [audience, setAudience] = useState<Audience>("ACCEPTED");
  const [regionId, setRegionId] = useState(ALL_REGIONS);
  const [extra, setExtra] = useState("");
  const [exact, setExact] = useState<{ total: number; manualInvalid: string[] } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getCampaignDetailAction>> | null>(null);
  const [limitsForm, setLimitsForm] = useState({ daily: String(initial.limits.daily), reserve: String(initial.limits.reserve) });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const stopRef = useRef(false);

  const refresh = useCallback(async () => setCenter(await getEmailCenterAction()), []);

  const manual = parseEmailList(extra);
  // Estimation avant confirmation : le total exact (adresses en double retirées) est calculé à la confirmation.
  const recipientCount = exact?.total ?? (audience === "MANUAL" ? 0 : (counts[audience] ?? 0)) + manual.valid.length;
  const { limits } = center;

  const changeRegion = (value: string | null) => {
    if (!value) return;
    setRegionId(value);
    setExact(null);
    startTransition(async () => setCounts(await getAudienceCountsAction(value === ALL_REGIONS ? null : value)));
  };

  /** Calcule le nombre exact de destinataires (adresses en double retirées) avant de demander confirmation. */
  const openConfirm = () => {
    setError("");
    startTransition(async () => {
      const preview = await getRecipientPreviewAction({
        audience,
        regionId: regionId === ALL_REGIONS ? null : regionId,
        extraEmails: extra,
      });
      if (preview.manualInvalid.length > 0) {
        setError(`Adresse(s) invalide(s) à corriger : ${preview.manualInvalid.join(", ")}`);
        return;
      }
      if (preview.total === 0) {
        setError(audience === "MANUAL" ? "Saisissez au moins une adresse e-mail valide." : "Aucun destinataire pour ce groupe.");
        return;
      }
      setExact({ total: preview.total, manualInvalid: [] });
      setConfirmOpen(true);
    });
  };

  const doPreview = () => {
    setError("");
    startTransition(async () => setPreview((await previewCampaignAction({ subject, body })).html));
  };

  const doTest = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await sendTestEmailAction({ subject, body });
      if (result.ok) setMessage(`E-mail de test envoyé à ${result.to}. Vérifiez sa réception avant l'envoi réel.`);
      else setError(result.error);
    });
  };

  /** Envoie les lots un par un jusqu'à la fin ou à une pause (limite du jour, quota du fournisseur). */
  const runCampaign = async (summary: { id: string; subject: string; counts: { total: number; sent: number; failed: number; pending: number } }) => {
    stopRef.current = false;
    setRun({
      campaignId: summary.id,
      subject: summary.subject,
      total: summary.counts.total,
      sent: summary.counts.sent,
      failed: summary.counts.failed,
      pending: summary.counts.pending,
      status: "SENDING",
      reason: null,
      finished: false,
    });
    while (!stopRef.current) {
      const result = await sendCampaignChunkAction(summary.id);
      if (!result.ok) {
        setRun(current => current && { ...current, status: "PAUSED", reason: result.error, finished: true });
        break;
      }
      setRun(current =>
        current && {
          ...current,
          sent: current.sent + result.sent,
          failed: current.failed + result.failed,
          pending: result.pending,
          status: result.status,
          reason: result.pausedReason,
          finished: result.status !== "SENDING",
        }
      );
      if (result.status !== "SENDING") break;
    }
    setRun(current => current && { ...current, finished: true });
    await refresh();
  };

  const launch = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      const created = await createCampaignAction({
        subject,
        body,
        audience,
        regionId: regionId === ALL_REGIONS ? null : regionId,
        extraEmails: extra,
      });
      setConfirmOpen(false);
      setAgree(false);
      if (!created.ok) {
        setError(created.error);
        return;
      }
      setSubject("");
      setBody("");
      setExtra("");
      setExact(null);
      setEditorKey(key => key + 1);
      await runCampaign({
        id: created.campaignId,
        subject,
        counts: { total: created.total, sent: 0, failed: 0, pending: created.total },
      });
    });
  };

  const openDetail = (id: string) => startTransition(async () => setDetail(await getCampaignDetailAction(id)));

  const retryFailed = (id: string) =>
    startTransition(async () => {
      const result = await retryFailedRecipientsAction(id);
      if (result.ok) {
        setMessage(`${result.requeued} destinataire(s) remis en file d'attente : cliquez sur « Reprendre ».`);
        setDetail(null);
        await refresh();
      }
    });

  const remove = async (campaign: CampaignSummary) => {
    const ok = await confirm({
      title: "Supprimer cette campagne ?",
      description: `« ${campaign.subject} » et son suivi seront supprimés. Les e-mails déjà partis ne peuvent pas être rappelés.`,
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteCampaignAction(campaign.id);
      await refresh();
    });
  };

  const saveLimits = () => {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await saveEmailLimitsAction({ daily: Number(limitsForm.daily), reserve: Number(limitsForm.reserve) });
      if (result.ok) {
        setMessage("Limites enregistrées.");
        await refresh();
      } else setError(result.error);
    });
  };

  const canSubmit =
    subject.trim().length >= 3 &&
    body.replace(/<[^>]*>/g, "").trim().length >= 10 &&
    ((audience === "MANUAL" ? 0 : (counts[audience] ?? 0)) + manual.valid.length > 0);
  const progress = run && run.total > 0 ? Math.round(((run.total - run.pending) / run.total) * 100) : 0;
  const regionName = center.regions.find(region => region.id === regionId)?.name;

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Communication · Super Admin</p>
        <h1 className="mt-1 text-3xl font-bold">Envoyer des e-mails</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Écrivez un message et envoyez-le aux candidats en attente, aux candidats acceptés, aux participants, à tous les
          utilisateurs ou à tout le monde. L&apos;envoi se fait par petits lots et peut être repris si la limite du jour est atteinte.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Envoyés aujourd'hui" value={limits.sentToday} />
            <Stat label="Limite quotidienne du plan" value={limits.daily} />
            <Stat label="Disponibles pour les campagnes" value={limits.available} danger={limits.available === 0} />
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-muted/30 p-3">
            <Field className="w-28">
              <FieldLabel>Limite / jour</FieldLabel>
              <Input type="number" min={1} value={limitsForm.daily} onChange={event => setLimitsForm(form => ({ ...form, daily: event.target.value }))} />
            </Field>
            <Field className="w-28">
              <FieldLabel>Réserve accès</FieldLabel>
              <Input type="number" min={0} value={limitsForm.reserve} onChange={event => setLimitsForm(form => ({ ...form, reserve: event.target.value }))} />
            </Field>
            <Button type="button" variant="outline" className="rounded-none" disabled={isPending} onClick={saveLimits}>
              Enregistrer
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          La <strong>réserve</strong> garde de la place pour les e-mails indispensables (accès des ambassadeurs, mot de passe oublié) :
          une campagne ne l&apos;utilise jamais. Réglez la limite sur celle de votre plan chez le fournisseur d&apos;e-mails.
        </p>
      </header>

      {message && <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>}
      {error && <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>}

      {/* Composition */}
      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">1. Destinataires</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map(item => {
              const active = audience === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setAudience(item.code);
                    setExact(null);
                  }}
                  className={`rounded-xl border p-4 text-left transition-all ${active ? "border-2 shadow-sm" : "hover:border-foreground/30"}`}
                  style={active ? { borderColor: charter.orange, backgroundColor: `${charter.orange}0d` } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{item.label}</span>
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                      <Users className="h-3 w-3" />
                      {item.code === "MANUAL" ? manual.valid.length : (counts[item.code] ?? 0)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 max-w-xl">
            <Field>
              <FieldLabel>
                {audience === "MANUAL" ? "Adresses e-mail des destinataires" : "Ajouter des adresses e-mail à la main (facultatif)"}
              </FieldLabel>
              <textarea
                value={extra}
                onChange={event => {
                  setExtra(event.target.value);
                  setExact(null);
                }}
                rows={3}
                placeholder="nom@exemple.com, autre@exemple.com&#10;Une adresse par ligne, ou séparées par une virgule"
                className="w-full rounded-none border border-border bg-muted/40 px-3.5 py-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:bg-white focus-visible:outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {manual.valid.length > 0 && (
                  <span className="font-medium text-foreground">{manual.valid.length} adresse(s) valide(s). </span>
                )}
                {audience === "MANUAL"
                  ? "Seules ces adresses recevront le message."
                  : "Elles s'ajoutent au groupe choisi (une adresse déjà dans le groupe n'est comptée qu'une fois)."}
                {manual.invalid.length > 0 && (
                  <span className="font-medium text-red-600"> À corriger : {manual.invalid.slice(0, 3).join(", ")}{manual.invalid.length > 3 ? "…" : ""}</span>
                )}
              </p>
            </Field>
          </div>

          <div className="mt-4 max-w-xs">
            <Field>
              <FieldLabel>Région (facultatif)</FieldLabel>
              <Select value={regionId} onValueChange={changeRegion}>
                <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
                  <SelectValue>{(value: string) => (value === ALL_REGIONS ? "Toutes les régions" : (center.regions.find(region => region.id === value)?.name ?? "Toutes les régions"))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_REGIONS}>Toutes les régions</SelectItem>
                  {center.regions.map(region => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">2. Message</h2>
          <div className="mt-3 space-y-4">
            <Field>
              <FieldLabel>Objet</FieldLabel>
              <Input value={subject} onChange={event => setSubject(event.target.value)} maxLength={150} placeholder="Ex. Information importante sur votre candidature" />
            </Field>
            <Field>
              <FieldLabel>Contenu</FieldLabel>
              <RichTextEditor
                key={editorKey}
                value={body}
                onChange={setBody}
                placeholder="Rédigez votre message. Écrivez {{prenom}} pour insérer le prénom du destinataire."
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Astuce : « Bonjour {"{{prenom}}"}, » devient « Bonjour Aminata, » pour chaque personne. Le message est mis en forme
              automatiquement aux couleurs de la JNJL, avec le logo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button type="button" variant="outline" className="rounded-none" disabled={isPending || !body} onClick={doPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Aperçu
          </Button>
          <Button type="button" variant="outline" className="rounded-none" disabled={isPending || !canSubmit} onClick={doTest}>
            <Mail className="mr-2 h-4 w-4" />
            M&apos;envoyer un test
          </Button>
          <Button
            type="button"
            className="rounded-none text-white"
            style={{ backgroundColor: charter.orange }}
            disabled={isPending || !canSubmit}
            onClick={openConfirm}
          >
            <Send className="mr-2 h-4 w-4" />
            Envoyer le message
          </Button>
        </div>
      </div>

      {/* Historique */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">Campagnes</h2>
            <p className="text-sm text-muted-foreground">Suivi des envois et reprise des campagnes interrompues.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-none" onClick={() => refresh()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Objet</th>
                <th className="px-5 py-4">Groupe</th>
                <th className="px-5 py-4">Progression</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {center.campaigns.map(campaign => {
                const badge = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.DRAFT;
                const percent = campaign.counts.total ? Math.round(((campaign.counts.total - campaign.counts.pending) / campaign.counts.total) * 100) : 0;
                return (
                  <tr key={campaign.id} className="hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <p className="font-medium">{campaign.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(campaign.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {audienceLabel(campaign.audience)}
                      {campaign.regionName && <span className="block text-xs text-muted-foreground">{campaign.regionName}</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: charter.orange }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {campaign.counts.sent} envoyé(s) / {campaign.counts.total}
                        {campaign.counts.failed > 0 && <span className="text-red-600"> · {campaign.counts.failed} échec(s)</span>}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                      {campaign.pausedReason && campaign.status === "PAUSED" && (
                        <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{campaign.pausedReason}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {campaign.counts.pending > 0 && (
                          <Button type="button" size="sm" className="rounded-none" disabled={!!run && !run.finished} onClick={() => runCampaign(campaign)}>
                            <Play className="mr-2 h-4 w-4" />
                            Reprendre
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="outline" className="rounded-none" onClick={() => openDetail(campaign.id)}>
                          Détails
                        </Button>
                        <Button type="button" size="icon" variant="ghost" title="Supprimer" onClick={() => remove(campaign)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {center.campaigns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    Aucune campagne pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation */}
      <Dialog open={confirmOpen} onOpenChange={open => !open && !isPending && setConfirmOpen(false)}>
        <DialogContent className="rounded-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer ce message ?</DialogTitle>
            <DialogDescription>Relisez bien : un e-mail envoyé ne peut pas être rappelé.</DialogDescription>
          </DialogHeader>
          <dl className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
            <div><dt className="inline text-muted-foreground">Objet : </dt><dd className="inline font-medium">{subject}</dd></div>
            <div>
              <dt className="inline text-muted-foreground">Destinataires : </dt>
              <dd className="inline font-medium">
                {audienceLabel(audience)}
                {regionName && audience !== "MANUAL" ? ` — ${regionName}` : ""}
                {manual.valid.length > 0 && audience !== "MANUAL" ? ` + ${manual.valid.length} adresse(s) saisie(s)` : ""} ({recipientCount})
              </dd>
            </div>
          </dl>
          {recipientCount > limits.available ? (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Il reste {limits.available} envoi(s) disponible(s) aujourd&apos;hui. L&apos;envoi s&apos;arrêtera à la limite puis pourra être
              repris demain depuis la liste des campagnes.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Durée estimée : environ {Math.max(1, Math.ceil((recipientCount * 0.7) / 60))} minute(s). Gardez cette page ouverte pendant l&apos;envoi.
            </p>
          )}
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox className="mt-0.5" checked={agree} onCheckedChange={value => setAgree(Boolean(value))} />
            <span>
              Je confirme l&apos;envoi à <strong>{recipientCount}</strong> personne{recipientCount > 1 ? "s" : ""}.
            </span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" className="rounded-none" disabled={isPending} onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="rounded-none text-white" style={{ backgroundColor: charter.orange }} disabled={isPending || !agree} onClick={launch}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Envoyer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Envoi en cours */}
      <Dialog open={run !== null} onOpenChange={open => !open && run?.finished && setRun(null)} closeOnOutsideClick={false}>
        <DialogContent className="rounded-none sm:max-w-md" showCloseButton={!!run?.finished}>
          {run && (
            <>
              <DialogHeader>
                <DialogTitle>{run.finished ? (run.status === "DONE" ? "Envoi terminé" : "Envoi en pause") : "Envoi en cours…"}</DialogTitle>
                <DialogDescription className="line-clamp-2">{run.subject}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: charter.orange }} />
                </div>
                <p className="text-sm">
                  <strong>{run.sent}</strong> envoyé(s) sur {run.total}
                  {run.failed > 0 && <span className="text-red-600"> · {run.failed} en échec</span>}
                  {run.pending > 0 && <span className="text-muted-foreground"> · {run.pending} restant(s)</span>}
                </p>
              </div>
              {run.reason && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{run.reason}</p>}
              {!run.finished && <p className="text-xs text-muted-foreground">Ne fermez pas cette page : l&apos;envoi se fait pendant qu&apos;elle est ouverte.</p>}
              <div className="flex justify-end gap-3 pt-1">
                {run.finished ? (
                  <Button type="button" className="rounded-none" onClick={() => setRun(null)}>
                    Fermer
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="rounded-none" onClick={() => { stopRef.current = true; }}>
                    <Pause className="mr-2 h-4 w-4" />
                    Mettre en pause
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Aperçu */}
      <Dialog open={preview !== null} onOpenChange={open => !open && setPreview(null)}>
        <DialogContent className="max-h-[92vh] rounded-none sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aperçu du message</DialogTitle>
            <DialogDescription>Tel que le recevra chaque destinataire (exemple avec le prénom « Aminata »).</DialogDescription>
          </DialogHeader>
          {preview && <iframe title="Aperçu de l'e-mail" srcDoc={preview} sandbox="" className="h-[65vh] w-full border bg-white" />}
        </DialogContent>
      </Dialog>

      {/* Détails d'une campagne */}
      <Dialog open={detail !== null} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-none sm:max-w-xl">
          {detail && detail.ok ? (
            <>
              <DialogHeader>
                <DialogTitle className="line-clamp-2">{detail.summary.subject}</DialogTitle>
                <DialogDescription>
                  {audienceLabel(detail.summary.audience)}
                  {detail.summary.regionName ? ` — ${detail.summary.regionName}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Envoyés" value={detail.summary.counts.sent} />
                <Stat label="Restants" value={detail.summary.counts.pending} />
                <Stat label="En échec" value={detail.summary.counts.failed} danger={detail.summary.counts.failed > 0} />
              </div>
              {detail.failures.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Envois en échec</p>
                  <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border p-3 text-sm">
                    {detail.failures.map(failure => (
                      <li key={failure.email}>
                        <span className="font-medium">{failure.email}</span>
                        <span className="block text-xs text-muted-foreground">{failure.error}</span>
                      </li>
                    ))}
                  </ul>
                  <Button type="button" className="rounded-none" disabled={isPending} onClick={() => retryFailed(detail.summary.id)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Relancer les échecs
                  </Button>
                </div>
              )}
            </>
          ) : (
            detail && <p className="text-sm text-destructive">{detail.ok ? "" : detail.error}</p>
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
