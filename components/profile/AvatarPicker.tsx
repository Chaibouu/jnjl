"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  removeAvatarAction,
  setPresetAvatarAction,
  uploadAvatarAction,
} from "@/actions/avatar-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AVATAR_UPLOAD, DEFAULT_AVATAR, PRESET_AVATARS } from "@/lib/avatars";

type Selection =
  | { kind: "none" }
  | { kind: "preset"; url: string }
  | { kind: "upload"; blob: Blob; previewUrl: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage: string | null;
  onChanged: (image: string | null) => void;
};

/** Recadre l'image en carré centré et la réduit avant l'envoi (une photo de téléphone dépasse vite 4 Mo). */
async function toSquareBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(side, 1024);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Traitement de l'image indisponible");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/webp", 0.88),
  );
  if (!blob) throw new Error("Impossible de traiter cette image");
  return blob;
}

export function AvatarPicker({ open, onOpenChange, currentImage, onChanged }: Props) {
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSelection({ kind: "none" });
    setError("");
  }, [open]);

  useEffect(() => {
    return () => {
      if (selection.kind === "upload") URL.revokeObjectURL(selection.previewUrl);
    };
  }, [selection]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!AVATAR_UPLOAD.allowedTypes.includes(file.type)) {
      setError("Format non supporté : utilisez une image JPEG, PNG ou WebP.");
      return;
    }
    try {
      const blob = await toSquareBlob(file);
      if (blob.size > AVATAR_UPLOAD.maxBytes) {
        setError("Cette image est trop volumineuse, choisissez-en une plus légère.");
        return;
      }
      setSelection({ kind: "upload", blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setError("Cette image est illisible.");
    }
  }

  function save() {
    if (selection.kind === "none") return;
    setError("");
    startTransition(async () => {
      try {
        let result: { image: string | null };
        if (selection.kind === "preset") {
          result = await setPresetAvatarAction(selection.url);
        } else {
          const formData = new FormData();
          formData.append("file", new File([selection.blob], "avatar.webp", { type: "image/webp" }));
          result = await uploadAvatarAction(formData);
        }
        onChanged(result.image);
        toast.success("Photo de profil mise à jour");
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible d'enregistrer la photo");
      }
    });
  }

  function remove() {
    setError("");
    startTransition(async () => {
      try {
        await removeAvatarAction();
        onChanged(null);
        toast.success("Photo de profil retirée");
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible de retirer la photo");
      }
    });
  }

  const preview =
    selection.kind === "preset"
      ? selection.url
      : selection.kind === "upload"
        ? selection.previewUrl
        : (currentImage ?? DEFAULT_AVATAR);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier ma photo de profil</DialogTitle>
          <DialogDescription>
            Choisissez un avatar ou téléversez votre propre photo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <Image
            src={preview}
            alt="Aperçu"
            width={96}
            height={96}
            unoptimized
            className="size-24 rounded-full object-cover ring-2 ring-border"
          />
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept={AVATAR_UPLOAD.allowedTypes.join(",")}
              className="hidden"
              onChange={e => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus /> Téléverser ma photo
            </Button>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG ou WebP. Elle sera recadrée en carré.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Ou choisissez un avatar</p>
          <div className="grid max-h-56 grid-cols-4 gap-3 overflow-y-auto p-1 sm:grid-cols-6">
            {PRESET_AVATARS.map(url => {
              const selected =
                selection.kind === "preset"
                  ? selection.url === url
                  : selection.kind === "none" && currentImage === url;
              return (
                <button
                  key={url}
                  type="button"
                  disabled={isPending}
                  onClick={() => setSelection({ kind: "preset", url })}
                  aria-pressed={selected}
                  aria-label="Choisir cet avatar"
                  className={`relative aspect-square overflow-hidden rounded-full ring-2 transition ${
                    selected ? "ring-brand" : "ring-transparent hover:ring-border"
                  }`}
                >
                  <Image
                    src={url}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="size-full object-cover"
                  />
                  {selected && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                      <Check className="size-5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          {currentImage ? (
            <Button type="button" variant="outline" disabled={isPending} onClick={remove}>
              <Trash2 /> Retirer ma photo
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="cancel"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              loading={isPending}
              disabled={selection.kind === "none"}
              onClick={save}
            >
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
