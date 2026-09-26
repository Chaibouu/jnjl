import charter from "@/settings/charter";

export type BadgeCardData = {
  label: string;
  number: string | null;
  awardedAt: Date;
  qrDataUrl: string | null;
  fullName: string;
  region: string;
  editionName: string;
  editionLocation: string | null;
  eventDate: string | null;
  badgeBackgroundColor: string | null;
  boardingStatus: string;
};

const PARTNER_LOGOS = [
  { src: "/partenaires/armoirie.png", alt: "République du Niger" },
  { src: "/partenaires/ANSI.png", alt: "ANSI" },
  { src: "/partenaires/Cabinet-Leader-dAfrique.png", alt: "Leader d'Afrique" },
];

/** Badge officiel de l'ambassadeur : logos partenaires, identité, QR code et matricule. */
export function BadgeCard({ badge }: { badge: BadgeCardData }) {
  const backgroundColor = badge.badgeBackgroundColor || charter.tertiary;

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg">
      {/* Logos partenaires */}
      <div className="flex items-center justify-between gap-2 bg-white px-5 py-3">
        {PARTNER_LOGOS.map(logo => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={logo.src} src={logo.src} alt={logo.alt} className="h-10 w-auto object-contain" />
        ))}
      </div>

      {/* Corps */}
      <div className="px-5 pb-5 pt-5 text-white" style={{ backgroundColor }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold leading-tight" style={{ color: charter.orange }}>
              Journée Nationale
              <br />
              du Jeune Leader
            </h2>
            <span className="mt-1 inline-block bg-white px-2 py-0.5 text-xs font-bold text-black">
              {badge.editionName}
            </span>
            <p className="mt-3 text-sm">
              <span className="font-bold">Matricule :</span>{" "}
              <span className="font-mono">{badge.number}</span>
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/jnjl.jpg"
            alt="Journée Nationale du Jeune Leader"
            className="h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover"
          />
        </div>

        <p className="mt-6 text-center text-lg font-bold">{badge.fullName}</p>

        {badge.qrDataUrl && (
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badge.qrDataUrl}
              alt={`QR code du badge ${badge.number}`}
              className="h-28 w-28 border-2 border-white bg-white p-1"
            />
          </div>
        )}
      </div>

      {/* Bandeau Ambassadeur + région */}
      <div className="py-2.5 text-center text-white" style={{ backgroundColor: charter.orange }}>
        <p className="text-base font-extrabold uppercase tracking-wide">Ambassadeur</p>
        <p className="text-sm font-medium">{badge.region}</p>
      </div>

      {/* Pied : date, lieu et statut d'embarquement */}
      <div className="px-4 py-3 text-center" style={{ backgroundColor }}>
        {badge.eventDate && (
          <p className="text-base font-bold" style={{ color: charter.orange }}>
            {badge.eventDate}
          </p>
        )}
        {badge.editionLocation && <p className="text-xs text-white/80">{badge.editionLocation}</p>}
        <p className="mt-2 text-[11px] text-white/60">
          Délivré le {new Date(badge.awardedAt).toLocaleDateString("fr-FR")} · Embarquement :{" "}
          {badge.boardingStatus === "EMBARQUE"
            ? "validé"
            : badge.boardingStatus === "ANNULE"
              ? "annulé"
              : "en attente de validation"}
        </p>
      </div>
    </div>
  );
}
