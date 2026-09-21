import Image from "next/image";
import charter from "@/settings/charter";

export type BadgeCardData = {
  label: string;
  number: string | null;
  awardedAt: Date;
  qrDataUrl: string | null;
  fullName: string;
  region: string;
  editionName: string;
  boardingStatus: string;
};

/** Badge officiel de l'ambassadeur : logo de la JNJL, identité, QR code et numéro. */
export function BadgeCard({ badge }: { badge: BadgeCardData }) {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden border bg-white shadow-lg">
      {/* Logo de la JNJL */}
      <div className="flex justify-center px-8 pt-6">
        <Image
          src="/jnjl.jpg"
          alt="Journée Nationale du Jeune Leader"
          width={150}
          height={150}
          priority
          className="h-36 w-36 object-contain"
        />
      </div>

      {/* Bandeau « Ambassadeur » */}
      <div
        className="mt-2 py-2 text-center text-sm font-bold uppercase tracking-[0.3em] text-white"
        style={{ backgroundColor: charter.orange }}
      >
        {badge.label.replace(" JNJL", "")}
      </div>

      <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-6 text-center">
        <div>
          <h2 className="text-2xl font-bold leading-tight" style={{ color: charter.ink }}>
            {badge.fullName}
          </h2>
          <p className="mt-1 text-sm font-medium" style={{ color: charter.orange }}>
            Région de {badge.region}
          </p>
          <p className="text-xs text-muted-foreground">{badge.editionName}</p>
        </div>

        {badge.qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={badge.qrDataUrl}
            alt={`QR code du badge ${badge.number}`}
            width={200}
            height={200}
            className="border p-1.5"
          />
        )}

        <p className="font-mono text-base font-semibold tracking-wider">{badge.number}</p>

        <div className="w-full border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Délivré le {new Date(badge.awardedAt).toLocaleDateString("fr-FR")}
          </p>
          <p className="mx-auto mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium">
            Embarquement :{" "}
            {badge.boardingStatus === "EMBARQUE"
              ? "validé"
              : badge.boardingStatus === "ANNULE"
                ? "annulé"
                : "en attente de validation par votre point focal"}
          </p>
        </div>
      </div>
    </div>
  );
}
