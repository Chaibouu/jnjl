"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Ban, Download, ListPlus, Pencil, RotateCcw, Search, Upload, UserPlus, X } from "lucide-react";
import {
  createAccessPassAction,
  createAccessPassesBulkAction,
  downloadAccessPassBadgeAction,
  listAccessPassesAction,
  resyncAccessPassQrsAction,
  setAccessPassStatusAction,
  updateAccessPassAction,
  uploadAccessPhotoAction,
  type AccessPassRow,
} from "@/actions/access-pass-actions";
import { ACCESS_CATEGORIES, organizationField } from "@/lib/access-categories";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Input } from "@/components/ui/input";

type EditionOption = { id: string; name: string; year: number };

const ALL = "ALL";

function downloadPdf(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function AccessPassManager({
  editions,
  initialEditionId,
  initialPasses,
}: {
  editions: EditionOption[];
  initialEditionId: string;
  initialPasses: AccessPassRow[];
}) {
  const [editionId, setEditionId] = useState(initialEditionId);
  const [passes, setPasses] = useState(initialPasses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [form, setForm] = useState({
    fullName: "",
    category: "MEDIA",
    organization: "",
    jobTitle: "",
    photoUrl: "",
    phone: "",
    email: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [bulkCategory, setBulkCategory] = useState("MEDIA");
  const [bulkText, setBulkText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirm();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return passes.filter(pass => {
      if (categoryFilter !== ALL && pass.category !== categoryFilter) return false;
      if (!query) return true;
      return `${pass.fullName} ${pass.organization ?? ""} ${pass.jobTitle ?? ""} ${pass.number} ${pass.phone ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [passes, search, categoryFilter]);

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const pass of passes) byCategory.set(pass.category, (byCategory.get(pass.category) ?? 0) + 1);
    return byCategory;
  }, [passes]);

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

  const changeEdition = (value: string) => {
    setEditionId(value);
    run(async () => setPasses(await listAccessPassesAction(value)));
  };

  const canSubmit =
    form.fullName.trim().length > 0 &&
    (!organizationField(form.category).required || form.organization.trim().length > 0);

  const emptyForm = (category: string) => ({
    fullName: "",
    category,
    organization: "",
    jobTitle: "",
    photoUrl: "",
    phone: "",
    email: "",
  });

  const startEdit = (pass: AccessPassRow) => {
    setMode("single");
    setEditingId(pass.id);
    setForm({
      fullName: pass.fullName,
      category: pass.category,
      organization: pass.organization ?? "",
      jobTitle: pass.jobTitle ?? "",
      photoUrl: pass.photoUrl ?? "",
      phone: pass.phone ?? "",
      email: pass.email ?? "",
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(current => emptyForm(current.category));
  };

  const saveEdit = () =>
    run(async () => {
      if (!editingId) return;
      const result = await updateAccessPassAction(editingId, form);
      setPasses(items => items.map(item => (item.id === editingId ? result.pass : item)));
      setMessage(`Badge ${result.pass.number} mis à jour : retéléchargez-le pour obtenir la nouvelle version.`);
      cancelEdit();
    });

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const result = await uploadAccessPhotoAction(data);
      setForm(current => ({ ...current, photoUrl: result.url }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Téléversement impossible");
    } finally {
      setUploading(false);
    }
  };

  const addOne = () =>
    run(async () => {
      const result = await createAccessPassAction(editionId, form);
      setPasses(items => [result.pass, ...items]);
      setForm(current => emptyForm(current.category));
      setMessage(
        result.synced
          ? `Badge ${result.pass.number} créé pour ${result.pass.fullName}.`
          : `Badge ${result.pass.number} créé, mais ScanHub n'a pas répondu : le QR sera créé au téléchargement du badge.`
      );
    });

  const addMany = () =>
    run(async () => {
      const result = await createAccessPassesBulkAction(editionId, bulkCategory, bulkText);
      setPasses(await listAccessPassesAction(editionId));
      if (result.errors.length === 0) setBulkText("");
      setMessage(
        `${result.created} badge${result.created > 1 ? "s" : ""} créé${result.created > 1 ? "s" : ""}.` +
          (result.notSynced > 0 ? ` ${result.notSynced} QR à créer au téléchargement (ScanHub injoignable).` : "")
      );
      if (result.errors.length > 0) setError(result.errors.join(" · "));
    });

  const download = (pass: AccessPassRow) =>
    run(async () => {
      const file = await downloadAccessPassBadgeAction(pass.id);
      if (!file.base64 || !file.filename) {
        setError(file.error ?? "Téléchargement impossible");
        return;
      }
      downloadPdf(file.base64, file.filename);
      // Le téléchargement a pu créer le QR dans ScanHub : on rafraîchit l'état.
      setPasses(await listAccessPassesAction(editionId));
    });

  const resync = () =>
    run(async () => {
      const result = await resyncAccessPassQrsAction(editionId);
      setPasses(await listAccessPassesAction(editionId));
      if (result.total === 0) setMessage("Tous les QR sont déjà synchronisés avec ScanHub.");
      else if (result.failed === 0) setMessage(`${result.synced} QR synchronisé(s) avec ScanHub.`);
      else setError(`${result.synced} synchronisé(s), ${result.failed} en échec : ${result.error ?? "erreur inconnue"}`);
    });

  const toggle = async (pass: AccessPassRow) => {
    const revoke = pass.status === "ACTIF";
    const confirmed = await confirm({
      title: revoke ? "Révoquer ce badge ?" : "Rétablir ce badge ?",
      description: revoke
        ? `${pass.fullName} ne pourra plus entrer avec ce badge (le QR sera refusé).`
        : `Le badge de ${pass.fullName} redevient valide.`,
      confirmLabel: revoke ? "Révoquer" : "Rétablir",
      variant: revoke ? "destructive" : undefined,
    });
    if (!confirmed) return;
    run(async () => {
      const result = await setAccessPassStatusAction(pass.id, !revoke);
      setPasses(items => items.map(item => (item.id === pass.id ? { ...item, status: result.status } : item)));
      setMessage(
        result.synced
          ? revoke
            ? "Badge révoqué."
            : "Badge rétabli."
          : "Statut enregistré, mais ScanHub n'a pas répondu : le QR n'est pas encore à jour."
      );
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Badges</p>
          <h1 className="mt-1 text-3xl font-bold">Accès & badges</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Médias, commissions, comité d&apos;organisation, intervenants, points focaux, personnel d&apos;appui…
            Ajoutez une personne, générez son badge : le QR est contrôlé par ScanHub et vaut présence à l&apos;entrée.
          </p>
        </div>
        {editions.length > 1 && (
          <div className="w-full sm:w-64">
            <select value={editionId} onChange={event => changeEdition(event.target.value)} className={selectClass}>
              {editions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.year})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "single" ? "default" : "outline"}
            onClick={() => setMode("single")}
            className="gap-2 rounded-none"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter une personne
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "bulk" ? "default" : "outline"}
            onClick={() => setMode("bulk")}
            className="gap-2 rounded-none"
          >
            <ListPlus className="h-4 w-4" />
            Ajouter une liste
          </Button>
        </div>

        {mode === "single" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Nom complet *
              <Input
                value={form.fullName}
                onChange={event => setForm({ ...form, fullName: event.target.value })}
                placeholder="Ex. Aïssatou Moussa"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Catégorie *
              <select
                value={form.category}
                onChange={event => setForm({ ...form, category: event.target.value })}
                className={selectClass}
              >
                {ACCESS_CATEGORIES.map(category => (
                  <option key={category.code} value={category.code}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              {organizationField(form.category).label}
              {organizationField(form.category).required ? " *" : ""}
              <Input
                value={form.organization}
                onChange={event => setForm({ ...form, organization: event.target.value })}
                placeholder={organizationField(form.category).placeholder}
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Fonction
              <Input
                value={form.jobTitle}
                onChange={event => setForm({ ...form, jobTitle: event.target.value })}
                placeholder="Ex. Journaliste"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Téléphone
              <Input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              E-mail
              <Input value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
            </label>
            {(form.category === "INTERVENANT" || form.photoUrl) && (
              <div className="space-y-1 text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-3">
                <span>Photo (affichée sur le badge Speaker, JPEG ou PNG)</span>
                <div className="flex items-center gap-3">
                  {form.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.photoUrl} alt="" className="h-20 w-16 rounded-md border object-cover" />
                  ) : (
                    <span className="flex h-20 w-16 items-center justify-center rounded-md border border-dashed text-[10px]">
                      Aucune
                    </span>
                  )}
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (file) uploadPhoto(file);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    loading={uploading}
                    onClick={() => photoInput.current?.click()}
                    className="gap-2 rounded-none"
                  >
                    <Upload className="h-4 w-4" />
                    {form.photoUrl ? "Changer la photo" : "Téléverser une photo"}
                  </Button>
                  {form.photoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setForm({ ...form, photoUrl: "" })}
                      className="rounded-none"
                    >
                      Retirer
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
              {editingId ? (
                <>
                  <Button
                    type="button"
                    loading={isPending}
                    disabled={!canSubmit}
                    onClick={saveEdit}
                    className="gap-2 rounded-none"
                  >
                    <Pencil className="h-4 w-4" />
                    Enregistrer les modifications
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit} className="gap-2 rounded-none">
                    <X className="h-4 w-4" />
                    Annuler
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  loading={isPending}
                  disabled={!canSubmit}
                  onClick={addOne}
                  className="gap-2 rounded-none"
                >
                  <UserPlus className="h-4 w-4" />
                  Ajouter et générer le badge
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block max-w-xs space-y-1 text-xs font-medium text-muted-foreground">
              Catégorie de toute la liste
              <select value={bulkCategory} onChange={event => setBulkCategory(event.target.value)} className={selectClass}>
                {ACCESS_CATEGORIES.map(category => (
                  <option key={category.code} value={category.code}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              Une personne par ligne : Nom complet ; Précision (média, commission, service…) ; Fonction ; Téléphone ; E-mail
              <textarea
                value={bulkText}
                onChange={event => setBulkText(event.target.value)}
                rows={7}
                placeholder={"Aïssatou Moussa ; Télé Sahel ; Journaliste ; 90000000\nIbrahim Salou ; Radio Anfani ; Reporter"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal text-foreground"
              />
            </label>
            <Button
              type="button"
              loading={isPending}
              disabled={!bulkText.trim()}
              onClick={addMany}
              className="gap-2 rounded-none"
            >
              <ListPlus className="h-4 w-4" />
              Ajouter la liste et générer les badges
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Badges d&apos;accès</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} sur {passes.length} personne{passes.length > 1 ? "s" : ""}
              {" · "}
              {passes.filter(pass => pass.checkedInAt).length} pointée
              {passes.filter(pass => pass.checkedInAt).length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {passes.some(pass => !pass.qrSynced) && (
              <Button type="button" variant="outline" loading={isPending} onClick={resync} className="rounded-none">
                Resynchroniser les QR (ScanHub)
              </Button>
            )}
            <select
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value)}
              className={`${selectClass} sm:w-56`}
            >
              <option value={ALL}>Toutes les catégories</option>
              {ACCESS_CATEGORIES.map(category => (
                <option key={category.code} value={category.code}>
                  {category.label} ({counts.get(category.code) ?? 0})
                </option>
              ))}
            </select>
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
        {message && <p className="border-b px-5 py-3 text-sm text-green-600">{message}</p>}
        {error && <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Personne</th>
                <th className="px-5 py-4">Catégorie</th>
                <th className="px-5 py-4">Badge</th>
                <th className="px-5 py-4">Présence</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(pass => (
                <tr key={pass.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">{pass.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[pass.organization, pass.jobTitle, pass.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4">{pass.categoryLabel}</td>
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs">{pass.number}</p>
                    {!pass.qrSynced && (
                      <span className="mt-1 mr-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        QR non synchronisé avec ScanHub
                      </span>
                    )}
                    {pass.status !== "ACTIF" && (
                      <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Révoqué
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {pass.checkedInAt ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        Pointé le {new Date(pass.checkedInAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pas encore arrivé</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Modifier"
                        disabled={isPending}
                        onClick={() => startEdit(pass)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Télécharger le badge (PDF)"
                        disabled={isPending}
                        onClick={() => download(pass)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title={pass.status === "ACTIF" ? "Révoquer" : "Rétablir"}
                        disabled={isPending}
                        onClick={() => toggle(pass)}
                      >
                        {pass.status === "ACTIF" ? (
                          <Ban className="h-4 w-4 text-destructive" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    Aucun badge d&apos;accès.
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
