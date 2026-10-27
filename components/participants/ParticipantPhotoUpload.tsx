"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { removeParticipantPhotoAction, uploadParticipantPhotoAction } from "@/actions/participant-photo-actions";
import { Button } from "@/components/ui/button";
import { shrinkImage } from "@/lib/client-image";
import charter from "@/settings/charter";

/**
 * Photo facultative du badge d'un participant : ajout, remplacement ou retrait. Sans photo, le badge garde le logo de
 * la JNJL. La photo est réduite dans le navigateur avant l'envoi (une photo de téléphone pèse plusieurs Mo).
 */
export function ParticipantPhotoUpload({
  applicationId,
  initialPhotoUrl,
}: {
  applicationId: string;
  initialPhotoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", await shrinkImage(file));
      const result = await uploadParticipantPhotoAction(applicationId, formData);
      if (result.ok) {
        setPhotoUrl(result.photoUrl);
        setMessage({ ok: true, text: "Photo enregistrée : elle apparaîtra sur votre badge." });
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  };

  const remove = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await removeParticipantPhotoAction(applicationId);
      if (result.ok) {
        setPhotoUrl(null);
        setMessage({ ok: true, text: "Photo retirée : votre badge affichera le logo de la JNJL." });
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  };

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
        Photo facultative pour votre badge. Sans photo, le badge garde le logo de la JNJL. Téléchargez ensuite votre badge pour
        la voir dessus.
      </p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={upload} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="sm" loading={isPending} onClick={() => inputRef.current?.click()}>
          <Camera className="mr-2 h-4 w-4" />
          {photoUrl ? "Changer la photo" : "Ajouter ma photo"}
        </Button>
        {photoUrl && (
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={remove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Retirer
          </Button>
        )}
      </div>
      {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-destructive"}`}>{message.text}</p>}
    </div>
  );
}
