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
  /** Photo de profil de l'ambassadeur (affichée dans le cercle) ; à défaut, ses initiales. */
  photoUrl?: string | null;
};

// Mêmes repères que le badge PDF (lib/generate-badge-pdf.ts) : image de fond de 908 × 1280 px,
// éléments positionnés en pourcentage et textes en « cqw » (1 % de la largeur du badge) pour que
// l'aperçu reste identique à toutes les tailles d'écran.
const W = 908;
const H = 1280;
const pctX = (x: number) => `${(x / W) * 100}%`;
const pctY = (y: number) => `${(y / H) * 100}%`;

/** Taille de texte (en cqw) qui tient dans `maxWidthPx` pour `length` caractères, plafonnée à `maxCqw`. */
function fitCqw(length: number, maxWidthPx: number, maxCqw: number, widthFactor = 0.65) {
  const fitted = ((maxWidthPx / W) * 100) / (Math.max(length, 1) * widthFactor);
  return Math.min(maxCqw, fitted);
}

function initialsOf(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

// Cercle photo : centre et rayon utile (sous l'anneau de la maquette).
const CIRCLE = { cx: 250, cy: 878, r: 196 };

/** Badge officiel de l'ambassadeur : design officiel avec région, photo, QR code, nom et matricule. */
export function BadgeCard({ badge }: { badge: BadgeCardData }) {
  const region = badge.region.toUpperCase();
  const name = badge.fullName.toUpperCase();

  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        className="relative w-full overflow-hidden rounded-lg bg-white shadow-lg"
        style={{ aspectRatio: `${W} / ${H}`, containerType: "inline-size" } as React.CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/badge-ambassadeur.jpg"
          alt="Badge ambassadeur JNJL 2026"
          className="absolute inset-0 h-full w-full"
        />

        {/* Région : recouvre « NIAMEY » de l'image et affiche la région de l'ambassadeur */}
        <div
          className="absolute flex items-center justify-center rounded-md font-extrabold text-white"
          style={{
            left: pctX(323),
            top: pctY(551),
            width: pctX(261),
            height: pctY(57),
            backgroundColor: "#12348E",
            fontSize: `${fitCqw(region.length, 230, 5, 0.66)}cqw`,
            lineHeight: 1,
          }}
        >
          {region}
        </div>

        {/* Photo de profil dans le cercle de la maquette */}
        <div
          className="absolute overflow-hidden rounded-full bg-white"
          style={{
            left: pctX(CIRCLE.cx - CIRCLE.r),
            top: pctY(CIRCLE.cy - CIRCLE.r),
            width: pctX(CIRCLE.r * 2),
            aspectRatio: "1 / 1",
          }}
        >
          {badge.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={badge.photoUrl} alt={`Photo de ${badge.fullName}`} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-extrabold"
              style={{ color: "#d6e0f3", fontSize: "19cqw" }}
            >
              {initialsOf(badge.fullName)}
            </div>
          )}
        </div>

        {/* QR code : à droite du cercle, sous le logo */}
        {badge.qrDataUrl && (
          <div
            className="absolute border border-slate-200 bg-white"
            style={{ left: pctX(558), top: pctY(848), width: pctX(230), aspectRatio: "1 / 1", padding: pctX(14) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badge.qrDataUrl}
              alt={`QR code du badge ${badge.number}`}
              className="h-full w-full"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        )}

        {/* Bas du badge : nom complet et matricule */}
        <div
          className="absolute flex flex-col items-center text-center"
          style={{ left: pctX(60), top: pctY(1150), width: pctX(788) }}
        >
          <p
            className="font-extrabold leading-tight"
            style={{ color: "#12204D", fontSize: `${fitCqw(name.length, 788, 6.2)}cqw` }}
          >
            {name}
          </p>
          <p className="mt-[1.2cqw] font-mono font-bold" style={{ color: "#12204D", fontSize: "2.6cqw" }}>
            Matricule : {badge.number}
          </p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Embarquement :{" "}
        {badge.boardingStatus === "EMBARQUE"
          ? "validé"
          : badge.boardingStatus === "ANNULE"
            ? "annulé"
            : "en attente de validation"}
      </p>
    </div>
  );
}
