import { Clock, FileQuestion } from "lucide-react";
import { getMyBadgeAction } from "@/actions/badge-actions";
import { BadgeCard } from "@/components/ambassador/BadgeCard";
import { BadgeDownloadButton } from "@/components/ambassador/BadgeDownloadButton";
import charter from "@/settings/charter";

export default async function MyBadgePage() {
  const data = await getMyBadgeAction();

  if (!data) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Aucun badge</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucune candidature ambassadeur active n&apos;a été trouvée pour votre compte.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Parcours ambassadeur
        </p>
        <h1 className="mt-1 text-2xl font-bold">Mon badge</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre badge officiel d&apos;ambassadeur, à présenter lors de l&apos;embarquement et de l&apos;événement.
        </p>
      </div>

      {data.badge ? (
        <>
          <BadgeCard
            badge={{
              label: data.badge.label,
              number: data.badge.number,
              awardedAt: data.badge.awardedAt,
              qrDataUrl: data.badge.qrDataUrl,
              fullName: data.fullName,
              region: data.region,
              editionName: data.editionName,
              boardingStatus: data.boardingStatus,
            }}
          />
          <BadgeDownloadButton />
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-bold">
            {data.hasSignedEngagement ? "Badge en cours de préparation" : "Engagement à signer"}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {data.hasSignedEngagement
              ? "Votre fiche d'engagement est signée. L'administration va vous attribuer votre badge très prochainement."
              : "Vous devez d'abord signer votre fiche d'engagement pour recevoir votre badge."}
          </p>
        </div>
      )}
    </section>
  );
}
