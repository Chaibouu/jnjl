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

/** Badge officiel de l'ambassadeur : design officiel avec région, QR code, nom et matricule. */
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
            left: pctX(290),
            top: pctY(551),
            width: pctX(312),
            height: pctY(57),
            backgroundColor: "#12348E",
            fontSize: `${fitCqw(region.length, 270, 5, 0.66)}cqw`,
            lineHeight: 1,
          }}
        >
          {region}
        </div>

        {/* QR code : à droite du logo */}
        {badge.qrDataUrl && (
          <div
            className="absolute border border-slate-200 bg-white"
            style={{ left: pctX(500), top: pctY(722), width: pctX(340), aspectRatio: "1 / 1", padding: pctX(20) }}
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
        <p
          className="absolute text-center text-slate-500"
          style={{ left: pctX(500), top: pctY(1068), width: pctX(340), fontSize: "1.7cqw" }}
        >
          Présentez ce QR code à l&apos;entrée
        </p>

        {/* Bas du badge : nom complet, matricule, date */}
        <div
          className="absolute flex flex-col items-center text-center"
          style={{ left: pctX(60), top: pctY(1104), width: pctX(788) }}
        >
          <p
            className="font-extrabold leading-tight"
            style={{ color: "#12204D", fontSize: `${fitCqw(name.length, 788, 6.2)}cqw` }}
          >
            {name}
          </p>
          <span className="mt-[1.2cqw] block h-[0.3cqw] w-[26%]" style={{ backgroundColor: charter.orange }} />
          <p className="mt-[1.6cqw] font-mono font-bold" style={{ color: "#12204D", fontSize: "2.6cqw" }}>
            Matricule : {badge.number}
          </p>
          <p className="mt-[0.6cqw] text-slate-500" style={{ fontSize: "1.9cqw" }}>
            Délivré le {new Date(badge.awardedAt).toLocaleDateString("fr-FR")}
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
