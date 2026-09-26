"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { signEngagementAction } from "@/actions/engagement-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EngagementDraftPreview, SignedEngagementPreview } from "@/components/ambassador/EngagementPreview";
import charter from "@/settings/charter";

export function EngagementSignForm({
  engagementText,
  editionName,
  ambassadorName,
  region,
}: {
  engagementText: string;
  editionName: string;
  ambassadorName: string;
  region: string;
}) {
  // Une fois cochée, la case ne peut plus être décochée : l'engagement est définitif.
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await signEngagementAction();
        setFileUrl(result.fileUrl);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Une erreur est survenue"
        );
      }
    });
  };

  if (fileUrl) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10" style={{ color: charter.orange }} />
        <h2 className="text-lg font-bold">Engagement signé !</h2>
        <p className="text-sm text-muted-foreground">
          Vous pouvez maintenant continuer votre parcours ambassadeur.
        </p>
        <SignedEngagementPreview fileUrl={fileUrl} />
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
          style={{ color: charter.orange }}
        >
          <FileText className="h-4 w-4" />
          Télécharger ma fiche signée
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-5 text-sm leading-relaxed">
        {engagementText}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox
          className="mt-0.5"
          checked={checked}
          disabled={checked}
          // Une fois cochée, la case reste cochée : impossible de revenir en arrière.
          onCheckedChange={value => setChecked(current => current || Boolean(value))}
        />
        <span>
          <strong>Je m&apos;engage</strong> à respecter les termes de cette fiche, en tant que{" "}
          {ambassadorName} ({region}). Une fois cochée, cette case ne peut plus être décochée.
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <EngagementDraftPreview
          editionName={editionName}
          ambassadorName={ambassadorName}
          region={region}
          engagementText={engagementText}
          signatureName={ambassadorName}
        />
        <Button
          type="submit"
          loading={isPending}
          disabled={!checked}
          className="h-8 w-full rounded-none text-white hover:opacity-90 sm:w-auto sm:px-10"
          style={{ backgroundColor: charter.orange }}
        >
          {isPending ? "Signature en cours..." : "Signer et télécharger ma fiche"}
        </Button>
      </div>
    </form>
  );
}
