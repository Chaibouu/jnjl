"use client";

import { useRef, useState, useTransition } from "react";
import { Film, Image as ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import {
  addEditionMediaAction,
  deleteEditionMediaAction,
  deleteEditionStatAction,
  listEditionMediaAction,
  listEditionStatsAction,
  saveEditionStatAction,
} from "@/actions/edition-content-actions";
import { uploadSiteMediaAction } from "@/actions/site-media-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import charter from "@/settings/charter";

type Stat = Awaited<ReturnType<typeof listEditionStatsAction>>[number];
type MediaItem = Awaited<ReturnType<typeof listEditionMediaAction>>[number];

export function EditionContentManager({
  editionId,
  initialStats,
  initialMedia,
  canManageStats,
  canManageMedia,
}: {
  editionId: string;
  initialStats: Stat[];
  initialMedia: MediaItem[];
  canManageStats: boolean;
  canManageMedia: boolean;
}) {
  const [stats, setStats] = useState(initialStats);
  const [media, setMedia] = useState(initialMedia);
  const [statId, setStatId] = useState<string | undefined>();
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [mediaType, setMediaType] = useState<"PHOTO" | "VIDEO">("PHOTO");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaFile = async (file: File) => {
    setError("");
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.set("kind", "galleryPhoto");
      formData.set("file", file);
      const result = await uploadSiteMediaAction(formData);
      setMediaUrl(result.url);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Téléversement impossible");
    } finally {
      setUploadingMedia(false);
    }
  };

  const run = (task: () => Promise<void>) => {
    setError("");
    startTransition(async () => {
      try {
        await task();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const resetStatForm = () => {
    setStatId(undefined);
    setLabel("");
    setValue("");
  };

  const saveStat = () =>
    run(async () => {
      await saveEditionStatAction({ id: statId, editionId, label, value: Number(value) });
      setStats(await listEditionStatsAction(editionId));
      resetStatForm();
    });

  const removeStat = (id: string) =>
    run(async () => {
      await deleteEditionStatAction(id);
      setStats(await listEditionStatsAction(editionId));
      if (statId === id) resetStatForm();
    });

  const addMedia = () =>
    run(async () => {
      await addEditionMediaAction({ editionId, type: mediaType, url: mediaUrl, caption });
      setMedia(await listEditionMediaAction(editionId));
      setMediaUrl("");
      setCaption("");
    });

  const removeMedia = (id: string) =>
    run(async () => {
      await deleteEditionMediaAction(id);
      setMedia(await listEditionMediaAction(editionId));
    });

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      {canManageStats && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Chiffres clés</h2>
          <p className="text-sm text-muted-foreground">
            Affichés sur l&apos;accueil (édition active) et sur la page publique de l&apos;édition (une fois archivée).
          </p>

          <div className="mt-4 divide-y rounded-xl border">
            {stats.map(stat => (
              <div key={stat.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm">
                  <span className="font-semibold">{stat.value.toLocaleString("fr-FR")}</span>{" "}
                  <span className="text-muted-foreground">{stat.label}</span>
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Modifier"
                    onClick={() => {
                      setStatId(stat.id);
                      setLabel(stat.label);
                      setValue(String(stat.value));
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer"
                    disabled={isPending}
                    onClick={() => removeStat(stat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {stats.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun chiffre clé.</p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={label}
              onChange={event => setLabel(event.target.value)}
              placeholder="Libellé (ex. Participants)"
              className="h-11 rounded-none border border-border bg-muted/40 sm:flex-1"
            />
            <Input
              type="number"
              min={0}
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder="Valeur"
              className="h-11 rounded-none border border-border bg-muted/40 sm:w-32"
            />
            <Button
              type="button"
              loading={isPending} disabled={!label.trim() || value === ""}
              onClick={saveStat}
              className="h-11 rounded-none text-white hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              {statId ? "Enregistrer" : "Ajouter"}
            </Button>
            {statId && (
              <Button type="button" variant="cancel" onClick={resetStatForm} className="h-11 rounded-none">
                Annuler
              </Button>
            )}
          </div>
        </div>
      )}

      {canManageMedia && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Galerie</h2>
          <p className="text-sm text-muted-foreground">
            Photos et vidéos de l&apos;édition (liens vers l&apos;image, ou vers une vidéo YouTube / Vimeo).
          </p>

          <div className="mt-4 divide-y rounded-xl border">
            {media.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {item.type === "PHOTO" ? (
                    <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Film className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.caption || item.url}</p>
                    {item.caption && <p className="truncate text-xs text-muted-foreground">{item.url}</p>}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  disabled={isPending}
                  onClick={() => removeMedia(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {media.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun média.</p>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr_1fr_auto]">
            <Select value={mediaType} onValueChange={next => next && setMediaType(next as "PHOTO" | "VIDEO")}>
              <SelectTrigger className="h-11 w-full rounded-none border border-border bg-muted/40 px-3.5">
                <SelectValue>{(current: string) => (current === "VIDEO" ? "Vidéo" : "Photo")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHOTO">Photo</SelectItem>
                <SelectItem value="VIDEO">Vidéo</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Input
                value={mediaUrl}
                onChange={event => setMediaUrl(event.target.value)}
                placeholder="https://…"
                className={`h-11 rounded-none border border-border bg-muted/40 ${mediaType === "PHOTO" ? "pr-10" : ""}`}
              />
              {mediaType === "PHOTO" && (
                <>
                  <input
                    ref={mediaFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (file) handleMediaFile(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => mediaFileInputRef.current?.click()}
                    disabled={uploadingMedia}
                    aria-label="Téléverser une photo"
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            <Input
              value={caption}
              onChange={event => setCaption(event.target.value)}
              placeholder="Légende (optionnel)"
              className="h-11 rounded-none border border-border bg-muted/40"
            />
            <Button
              type="button"
              loading={isPending} disabled={!mediaUrl.trim()}
              onClick={addMedia}
              className="h-11 rounded-none text-white hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              Ajouter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
