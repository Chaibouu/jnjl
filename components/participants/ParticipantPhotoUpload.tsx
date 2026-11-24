"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Crop, Trash2 } from "lucide-react";
import {
  loadParticipantPhotoAction,
  removeParticipantPhotoAction,
  uploadParticipantPhotoAction,
} from "@/actions/participant-photo-actions";
import { PhotoCropper } from "@/components/participants/PhotoCropper";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

/**
 * Photo facultative du badge d'un participant : ajout, remplacement, ajustement (cadrage et zoom) ou retrait. Sans photo,
 * le badge garde le logo de la JNJL. La photo est cadrée dans le navigateur (cercle du badge) puis envoyée en 800 × 800.
 */
export function ParticipantPhotoUpload({
  applicationId,
  initialPhotoUrl,
  onChange,
}: {
  applicationId: string;
  initialPhotoUrl: string | null;
  /** Appelé après chaque enregistrement ou retrait (la page peut ainsi rafraîchir l'aperçu du badge). */
  onChange?: (photoUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [cropSource, setCropSource] = useState<Blob | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage(null);
    setCropSource(file);
  };

  /** Rouvre la photo enregistrée (lue par le serveur) pour la recadrer. */
  const adjustCurrent = () => {
    if (!photoUrl) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await loadParticipantPhotoAction(applicationId);
        if (!result.ok) {
          setMessage({ ok: false, text: result.error });
          return;
        }
        const bytes = Uint8Array.from(atob(result.base64), char => char.charCodeAt(0));
        setCropSource(new Blob([bytes], { type: result.mime }));
      } catch {
        setMessage({ ok: false, text: "Impossible de rouvrir la photo actuelle : choisissez-la de nouveau avec « Changer la photo »." });
      }
    });
  };

  const save = (file: File) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadParticipantPhotoAction(applicationId, formData);
        if (result.ok) {
          setPhotoUrl(result.photoUrl);
          setCropSource(null);
          setMessage({ ok: true, text: "Photo enregistrée : elle apparaîtra sur votre badge." });
          onChange?.(result.photoUrl);
        } else {
          setMessage({ ok: false, text: result.error });
        }
      } catch {
        setMessage({ ok: false, text: "Envoi impossible, veuillez réessayer." });
      }
    });
  };

  const remove = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await removeParticipantPhotoAction(applicationId);
        if (result.ok) {
          setPhotoUrl(null);
          setMessage({ ok: true, text: "Photo retirée : votre badge affichera le logo de la JNJL." });
          onChange?.(null);
        } else {
          setMessage({ ok: false, text: result.error });
        }
      } catch {
        setMessage({ ok: false, text: "Action impossible, veuillez réessayer." });
      }
    });
  };

  if (cropSource) {
    return (
      <div className="flex flex-col items-center gap-3">
        <PhotoCropper source={cropSource} busy={isPending} onCancel={() => setCropSource(null)} onConfirm={save} />
        {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-destructive"}`}>{message.text}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Votre photo" className="h-24 w-24 rounded-full border-2 object-cover" style={{ borderColor: charter.orange }} />
      ) : (
        <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed" style={{ borderColor: charter.border }}>
          <Camera className="h-8 w-8" style={{ color: charter.inkFaint }} />
        </span>
      )}
      <p className="max-w-xs text-xs" style={{ color: charter.inkSoft }}>
        Photo facultative pour votre badge. Sans photo, le badge garde le logo de la JNJL. Vous pourrez la cadrer et la zoomer
        avant de l&apos;enregistrer.
      </p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={pick} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="sm" loading={isPending} onClick={() => inputRef.current?.click()}>
          <Camera className="mr-2 h-4 w-4" />
          {photoUrl ? "Changer la photo" : "Ajouter ma photo"}
        </Button>
        {photoUrl && (
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={adjustCurrent}>
            <Crop className="mr-2 h-4 w-4" />
            Ajuster
          </Button>
        )}
        {photoUrl && (
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={remove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Retirer
          </Button>
        )}
      </div>
      {message && <p className={`max-w-xs text-sm ${message.ok ? "text-green-600" : "text-destructive"}`}>{message.text}</p>}
    </div>
  );
}
