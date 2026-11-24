"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Mêmes coordonnées (pixels de l'image de fond, 908 × 1280) que le badge PDF de lib/generate-badge-pdf.ts.
const W = 908;
const H = 1280;
const PILL_BLUE = "rgb(18,52,142)";
const ORANGE = "#F07321";
const NAVY = "rgb(18,31,77)";

const pctX = (x: number) => `${(x / W) * 100}%`;
const pctY = (y: number) => `${(y / H) * 100}%`;
/** Taille en px de l'image de fond → unité relative à la largeur du badge affiché. */
const cq = (px: number) => `${((px / W) * 100).toFixed(3)}cqw`;

/**
 * Aperçu du badge d'un participant, au même dessin que le PDF : avec photo (cercle) ou avec le grand logo de la JNJL.
 * C'est un aperçu : le PDF téléchargé reste la référence.
 */
export function ParticipantBadgePreview({
  fullName,
  region,
  badgeNumber,
  qrValue,
  photoUrl,
}: {
  fullName: string;
  region: string;
  badgeNumber: string;
  qrValue: string;
  photoUrl: string | null;
}) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrValue, { margin: 0, width: 400 })
      .then(url => active && setQr(url))
      .catch(() => active && setQr(""));
    return () => {
      active = false;
    };
  }, [qrValue]);

  const withPhoto = !!photoUrl;
  const card = withPhoto ? { x: 558, y: 848, size: 230 } : { x: 500, y: 708, size: 340 };
  const quiet = Math.round(card.size * 0.06);

  const name = fullName.toUpperCase();
  // Police du nom : 26 pt (≈ 56 px) au plus, réduite pour tenir dans la largeur du badge.
  const nameSize = Math.max(22, Math.min(56, (W - 120) / (Math.max(name.length, 1) * 0.7)));
  const label = region.toUpperCase();
  const labelSize = Math.max(22, Math.min(45, (267 - 40) / (Math.max(label.length, 1) * 0.7)));

  return (
    <div
      role="img"
      aria-label={`Aperçu du badge de ${fullName}`}
      className="relative mx-auto w-full max-w-[360px] overflow-hidden shadow-lg"
      style={{
        aspectRatio: `${W} / ${H}`,
        containerType: "inline-size",
        backgroundImage: `url(${withPhoto ? "/badge-generique.jpg" : "/badge-participant.jpg"})`,
        backgroundSize: "100% 100%",
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      {/* Titre */}
      <div
        className="absolute left-0 right-0 text-center font-bold"
        style={{ top: pctY(503 - 82 * 0.9), fontSize: cq(82), lineHeight: 1, color: ORANGE }}
      >
        PARTICIPANT
      </div>

      {/* Bandeau de la région */}
      <div
        className="absolute flex items-center justify-center font-bold text-white"
        style={{
          left: pctX(323),
          top: pctY(551),
          width: pctX(261),
          height: pctY(57),
          background: PILL_BLUE,
          borderRadius: cq(7),
          fontSize: cq(labelSize),
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>

      {/* Photo dans le cercle du badge */}
      {withPhoto && (
        <div
          className="absolute overflow-hidden rounded-full"
          style={{ left: pctX(250 - 196), top: pctY(878 - 196), width: pctX(392), aspectRatio: "1 / 1" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl!} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* QR code */}
      <div
        className="absolute bg-white"
        style={{
          left: pctX(card.x),
          top: pctY(card.y),
          width: pctX(card.size),
          aspectRatio: "1 / 1",
          border: "1px solid rgb(217,222,235)",
        }}
      >
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt=""
            className="absolute"
            style={{ left: `${(quiet / card.size) * 100}%`, top: `${(quiet / card.size) * 100}%`, width: `${100 - (quiet / card.size) * 200}%`, height: `${100 - (quiet / card.size) * 200}%` }}
          />
        )}
      </div>

      {/* Nom et numéro */}
      <div
        className="absolute left-0 right-0 text-center font-bold"
        style={{ top: pctY(1195 - nameSize * 0.9), fontSize: cq(nameSize), lineHeight: 1, color: NAVY, padding: `0 ${pctX(60)}`, whiteSpace: "nowrap" }}
      >
        {name}
      </div>
      <div
        className="absolute left-0 right-0 text-center font-bold"
        style={{ top: pctY(1223 - 23 * 0.9), fontSize: cq(22.7), lineHeight: 1, color: NAVY, fontFamily: "'Courier New', monospace" }}
      >
        Matricule : {badgeNumber}
      </div>
    </div>
  );
}
