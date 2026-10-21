import {
  PDFDocument,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import QRCode from "qrcode";
import { renderActiveTemplate } from "@/lib/pdf-templates/render";
import { loadPublicImage } from "@/lib/badge-assets";

// A6 portrait, en points (105 × 148 mm) : format d'un badge de conférence.
const WIDTH = 297.64;
const HEIGHT = 419.53;
const ORANGE = rgb(0.941, 0.451, 0.129); // #F07321
const BLACK_FALLBACK = rgb(0, 0, 0); // #000000 — repli si l'édition n'a pas de couleur de fond
const MUTED = rgb(0.45, 0.45, 0.45);
const WHITE = rgb(1, 1, 1);

/** "#282828" → rgb(...). Retombe sur le noir par défaut si la valeur est absente ou invalide. */
function hexToRgb(hex: string | null | undefined) {
  const match = hex?.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return BLACK_FALLBACK;
  const value = match[1]!;
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
}

/** Remplace les caractères que la police standard ne sait pas écrire (évite une erreur de génération). */
function safe(text: string, font: PDFFont): string {
  try {
    font.encodeText(text);
    return text;
  } catch {
    return Array.from(text)
      .map(char => {
        try {
          font.encodeText(char);
          return char;
        } catch {
          return "?";
        }
      })
      .join("");
  }
}

/** Plus grande taille (entre min et max) pour laquelle le texte tient dans la largeur donnée. */
function fitSize(text: string, font: PDFFont, maxWidth: number, max: number, min: number) {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

// ─── Designs officiels des badges ─────────────────────────────────────────────
// Chaque maquette est une image de fond de 908 × 1280 px (public/badge-*.jpg) qui contient l'en-tête,
// le titre (AMBASSADEUR, POINT FOCAL, COMMISSION, SPEAKER) et le logo. Sont dessinés par-dessus :
// le texte du bandeau (région ou nom de la commission), la photo (speaker), le QR code, puis le nom
// complet et les autres données. Les coordonnées sont en pixels de l'image.
export type DesignVariant = "ambassador" | "commission" | "speaker" | "generic";

const DESIGN_W = 908;
const DESIGN_H = 1280;
const DESIGN_PAGE_W = 420; // pt (≈ A5)
const DESIGN_PAGE_H = (DESIGN_PAGE_W * DESIGN_H) / DESIGN_W;
const PILL_BLUE = rgb(18 / 255, 52 / 255, 142 / 255);
const PILL_ORANGE = rgb(241 / 255, 115 / 255, 30 / 255);
const NAVY = rgb(0.07, 0.12, 0.3);
const GRAY = rgb(0.4, 0.4, 0.45);

type Box = { x: number; y: number; w: number; h: number };
type DesignConfig = {
  image: string;
  /** Bandeau dont le texte est remplacé (le texte d'origine est recouvert par la même couleur). */
  pill?: Box & { color: ReturnType<typeof rgb> };
  /** Emplacement de la photo en cadre arrondi (speaker), avec le rayon des coins. */
  photo?: Box & { radius: number };
  /** Photo de profil ronde (centre et rayon utile, sous l'anneau de la maquette). */
  photoCircle?: { cx: number; cy: number; r: number };
  /** Bas du badge resserré : nom, fonction et matricule seulement (le QR et la photo occupent la place). */
  compact?: boolean;
  qr: { x: number; y: number; size: number; caption: boolean };
  /** Titre dynamique dessiné sur un fond sans titre (badge générique). */
  dynamicTitle?: boolean;
  /** Ligne de base (en px) du nom ; le reste (fonction, trait, matricule, date) suit en dessous. */
  identityBaseline: number;
};

const DESIGNS: Record<DesignVariant, DesignConfig> = {
  ambassador: {
    image: "badge-ambassadeur.jpg",
    pill: { x: 320, y: 548, w: 267, h: 63, color: PILL_BLUE },
    photoCircle: { cx: 250, cy: 878, r: 196 },
    qr: { x: 510, y: 885, size: 280, caption: false },
    identityBaseline: 1195,
    compact: true,
  },
  commission: {
    image: "badge-commission.jpg",
    pill: { x: 250, y: 547, w: 407, h: 69, color: PILL_ORANGE },
    photoCircle: { cx: 251, cy: 870, r: 184 },
    qr: { x: 510, y: 885, size: 280, caption: false },
    identityBaseline: 1195,
    compact: true,
  },
  // Modèle « Ambassadeur » dont le titre a été retiré de l'image : point focal, médias, comité, personnel d'appui…
  generic: {
    image: "badge-generique.jpg",
    pill: { x: 320, y: 548, w: 267, h: 63, color: PILL_BLUE },
    photoCircle: { cx: 250, cy: 878, r: 196 },
    qr: { x: 510, y: 885, size: 280, caption: false },
    identityBaseline: 1195,
    compact: true,
    dynamicTitle: true,
  },
  speaker: {
    image: "badge-speaker.jpg",
    photo: { x: 52, y: 591, w: 373, h: 419, radius: 34 },
    qr: { x: 520, y: 810, size: 290, caption: false },
    identityBaseline: 1140,
  },
};

export type DesignParams = {
  fullName: string;
  /** Titre en grand (badge générique) : MÉDIA, PERSONNEL D'APPUI… */
  title?: string;
  /** Texte du bandeau : région (ambassadeur, point focal) ou nom de la commission. */
  region: string;
  /** Fonction affichée sous le nom (badges d'accès). */
  jobTitle?: string | null;
  /** Photo (JPEG ou PNG) du porteur : speakers. */
  photo?: Uint8Array | null;
  number: string;
  qrValue?: string;
  awardedAt: Date;
};

function isPng(bytes: Uint8Array) {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

/** Document en cours : polices et images de fond embarquées une seule fois, même pour des centaines de badges. */
type DesignContext = {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
  backgrounds: Map<string, PDFImage | null>;
};

async function createDesignContext(): Promise<DesignContext> {
  const doc = await PDFDocument.create();
  return {
    doc,
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.CourierBold),
    backgrounds: new Map(),
  };
}

/** Dessine un badge sur une nouvelle page du document ; faux si l'image de fond est introuvable. */
async function drawDesignBadgePage(ctx: DesignContext, variant: DesignVariant, params: DesignParams): Promise<boolean> {
  const design = DESIGNS[variant];
  const { doc, font, bold, mono } = ctx;

  if (!ctx.backgrounds.has(design.image)) {
    const bytes = await loadPublicImage(design.image);
    ctx.backgrounds.set(design.image, bytes ? await doc.embedJpg(bytes) : null);
  }
  const background = ctx.backgrounds.get(design.image);
  if (!background) return false;

  const page = doc.addPage([DESIGN_PAGE_W, DESIGN_PAGE_H]);

  const k = DESIGN_PAGE_W / DESIGN_W;
  const px = (x: number) => x * k;
  const py = (yTop: number) => DESIGN_PAGE_H - yTop * k;

  page.drawImage(background, { x: 0, y: 0, width: DESIGN_PAGE_W, height: DESIGN_PAGE_H });

  const centeredAt = (
    text: string,
    centerXpx: number,
    baselinePx: number,
    size: number,
    usedFont: PDFFont,
    color = NAVY
  ) => {
    const value = safe(text, usedFont);
    const width = usedFont.widthOfTextAtSize(value, size);
    page.drawText(value, { x: px(centerXpx) - width / 2, y: py(baselinePx), size, font: usedFont, color });
  };

  // Titre dynamique (badge générique) : orange, centré, sur une ou deux lignes selon sa longueur.
  if (design.dynamicTitle && params.title) {
    const title = safe(params.title.toUpperCase(), bold);
    const titleMaxWidth = px(640);
    const oneLine = fitSize(title, bold, titleMaxWidth, 38, 26);
    if (bold.widthOfTextAtSize(title, oneLine) <= titleMaxWidth) {
      centeredAt(title, 453, 503, oneLine, bold, ORANGE);
    } else {
      const parts = title.split(" ");
      const half = Math.ceil(parts.length / 2);
      const lines = [parts.slice(0, half).join(" "), parts.slice(half).join(" ")].filter(Boolean);
      lines.forEach((line, index) => {
        centeredAt(line, 453, lines.length === 1 ? 503 : 462 + index * 40, fitSize(line, bold, titleMaxWidth, 30, 14), bold, ORANGE);
      });
    }
  }

  // Bandeau : recouvre le texte d'origine (« NIAMEY »…) par la même couleur, puis écrit le nouveau texte.
  if (design.pill) {
    const { pill } = design;
    const inset = 3;
    const coverW = px(pill.w - inset * 2);
    const coverH = (pill.h - inset * 2) * k;
    const r = 7 * k;
    page.drawSvgPath(
      `M ${r} 0 H ${coverW - r} Q ${coverW} 0 ${coverW} ${r} V ${coverH - r} Q ${coverW} ${coverH} ${coverW - r} ${coverH} H ${r} Q 0 ${coverH} 0 ${coverH - r} V ${r} Q 0 0 ${r} 0 Z`,
      { x: px(pill.x + inset), y: py(pill.y + inset), color: pill.color }
    );
    const label = safe(params.region.toUpperCase(), bold);
    const size = fitSize(label, bold, px(pill.w - 40), 21, 9);
    centeredAt(label, pill.x + pill.w / 2, pill.y + pill.h / 2 + 8, size, bold, rgb(1, 1, 1));
  }

  // Photo de profil ronde : recadrée au centre sous l'anneau de la maquette ; à défaut, les initiales.
  if (design.photoCircle) {
    const { cx, cy, r } = design.photoCircle;
    const centerPx = px(cx);
    const centerPy = py(cy);
    const rad = r * k;
    const c = rad * 0.5523;
    let drawn = false;
    if (params.photo) {
      try {
        const image = isPng(params.photo) ? await doc.embedPng(params.photo) : await doc.embedJpg(params.photo);
        page.pushOperators(
          pushGraphicsState(),
          moveTo(centerPx + rad, centerPy),
          appendBezierCurve(centerPx + rad, centerPy + c, centerPx + c, centerPy + rad, centerPx, centerPy + rad),
          appendBezierCurve(centerPx - c, centerPy + rad, centerPx - rad, centerPy + c, centerPx - rad, centerPy),
          appendBezierCurve(centerPx - rad, centerPy - c, centerPx - c, centerPy - rad, centerPx, centerPy - rad),
          appendBezierCurve(centerPx + c, centerPy - rad, centerPx + rad, centerPy - c, centerPx + rad, centerPy),
          closePath(),
          clip(),
          endPath()
        );
        const scale = Math.max((rad * 2) / image.width, (rad * 2) / image.height);
        page.drawImage(image, {
          x: centerPx - (image.width * scale) / 2,
          y: centerPy - (image.height * scale) / 2,
          width: image.width * scale,
          height: image.height * scale,
        });
        page.pushOperators(popGraphicsState());
        drawn = true;
      } catch {
        // Photo illisible : on retombe sur les initiales.
      }
    }
    if (!drawn) {
      const initials = params.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase();
      const text = safe(initials, bold);
      const size = rad * 0.95;
      const width = bold.widthOfTextAtSize(text, size);
      page.drawText(text, { x: centerPx - width / 2, y: centerPy - size * 0.34, size, font: bold, color: rgb(0.84, 0.88, 0.95) });
    }
  }

  // Photo (speaker) : remplit le cadre bleu de la maquette, recadrée au centre, coins arrondis.
  if (design.photo && params.photo) {
    try {
      const image = isPng(params.photo) ? await doc.embedPng(params.photo) : await doc.embedJpg(params.photo);
      const box = design.photo;
      const left = px(box.x);
      const bottom = py(box.y + box.h);
      const width = px(box.w);
      const height = box.h * k;
      const rad = box.radius * k;
      const c = rad * 0.5523; // approximation d'un quart de cercle par une courbe de Bézier

      page.pushOperators(
        pushGraphicsState(),
        moveTo(left + rad, bottom),
        lineTo(left + width - rad, bottom),
        appendBezierCurve(left + width - rad + c, bottom, left + width, bottom + rad - c, left + width, bottom + rad),
        lineTo(left + width, bottom + height - rad),
        appendBezierCurve(left + width, bottom + height - rad + c, left + width - rad + c, bottom + height, left + width - rad, bottom + height),
        lineTo(left + rad, bottom + height),
        appendBezierCurve(left + rad - c, bottom + height, left, bottom + height - rad + c, left, bottom + height - rad),
        lineTo(left, bottom + rad),
        appendBezierCurve(left, bottom + rad - c, left + rad - c, bottom, left + rad, bottom),
        closePath(),
        clip(),
        endPath()
      );
      const scale = Math.max(width / image.width, height / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      page.drawImage(image, { x: left + (width - drawW) / 2, y: bottom + (height - drawH) / 2, width: drawW, height: drawH });
      page.pushOperators(popGraphicsState());
    } catch {
      // Photo illisible : le cadre bleu de la maquette reste, le badge est quand même généré.
    }
  }

  // QR code sur une carte blanche à fin liseré.
  const { qr: card } = design;
  const quiet = Math.round(card.size * 0.06);
  page.drawRectangle({
    x: px(card.x),
    y: py(card.y + card.size),
    width: px(card.size),
    height: px(card.size),
    color: rgb(1, 1, 1),
    borderColor: rgb(0.85, 0.87, 0.92),
    borderWidth: 1,
  });
  const qrDataUrl = await QRCode.toDataURL(params.qrValue ?? params.number, { margin: 0, width: 400 });
  const qrImage = await doc.embedPng(qrDataUrl.split(",")[1]!);
  page.drawImage(qrImage, {
    x: px(card.x + quiet),
    y: py(card.y + card.size - quiet),
    width: px(card.size - quiet * 2),
    height: px(card.size - quiet * 2),
  });
  if (card.caption) {
    centeredAt("Présentez ce QR code à l'entrée", card.x + card.size / 2, card.y + card.size + 34, 7.5, font, GRAY);
  }

  // Identité : nom complet (réduit puis sur deux lignes si besoin), fonction, matricule et date.
  const centerX = DESIGN_W / 2;
  const maxWidth = px(DESIGN_W - 120);
  const name = safe(params.fullName.toUpperCase(), bold);
  const words = name.split(" ");
  let baseline = design.identityBaseline;
  if (design.compact && bold.widthOfTextAtSize(name, 15) > maxWidth && words.length > 1) baseline -= 24; // deux lignes
  if (bold.widthOfTextAtSize(name, 15) > maxWidth && words.length > 1) {
    const half = Math.ceil(words.length / 2);
    for (const line of [words.slice(0, half).join(" "), words.slice(half).join(" ")]) {
      centeredAt(line, centerX, baseline, fitSize(line, bold, maxWidth, 22, 10), bold);
      baseline += 46;
    }
    baseline -= 46;
  } else {
    centeredAt(name, centerX, baseline, fitSize(name, bold, maxWidth, 26, 10), bold);
  }

  let cursor = baseline;
  const jobTitle = params.jobTitle?.trim();
  if (jobTitle) {
    cursor += design.compact ? 26 : 32;
    const text = safe(jobTitle, font);
    centeredAt(text, centerX, cursor, fitSize(text, font, maxWidth, 11, 7), font, GRAY);
  }
  if (design.compact) {
    // Mise en page resserrée : matricule seul sous le nom (pas de trait ni de date).
    centeredAt(`Matricule : ${params.number}`, centerX, cursor + 28, 10.5, mono, NAVY);
    return true;
  }
  page.drawRectangle({ x: px(centerX - 120), y: py(cursor + 22), width: px(240), height: 1.2, color: ORANGE });
  centeredAt(`Matricule : ${params.number}`, centerX, cursor + 58, 10.5, mono, NAVY);
  centeredAt(`Délivré le ${params.awardedAt.toLocaleDateString("fr-FR")}`, centerX, cursor + 84, 8, font, GRAY);

  return true;
}

export type DesignBadgeItem = { variant: DesignVariant; params: DesignParams };

/** Un seul PDF pour plusieurs badges (une page par badge), prêt à imprimer. `null` si aucune maquette n'est lisible. */
export async function generateDesignBadgesPdf(
  items: DesignBadgeItem[]
): Promise<{ pdf: Uint8Array; rendered: number } | null> {
  const ctx = await createDesignContext();
  let rendered = 0;
  for (const item of items) {
    if (await drawDesignBadgePage(ctx, item.variant, item.params)) rendered += 1;
  }
  if (rendered === 0) return null;
  return { pdf: await ctx.doc.save(), rendered };
}

async function generateDesignBadge(variant: DesignVariant, params: DesignParams): Promise<Uint8Array | null> {
  const result = await generateDesignBadgesPdf([{ variant, params }]);
  return result?.pdf ?? null;
}

export async function generateBadgePdf(params: {
  /** Si fourni, le modèle PDF actif de cette édition (éditeur admin) est utilisé en priorité. */
  editionId?: string;
  label: string;
  fullName: string;
  region: string;
  editionName: string;
  editionLocation?: string | null;
  eventDate?: string | null;
  /** Couleur de fond du badge (hex) — configurée par édition, repli sur le noir. */
  backgroundColor?: string | null;
  number: string;
  /** Contenu du QR (jeton ScanHub) ; à défaut le numéro du badge. */
  qrValue?: string;
  awardedAt: Date;
  /** Contenu du logo JNJL (JPEG) — le badge est généré sans logo s'il est absent. */
  logo?: Uint8Array | null;
  /** Logos partenaires (PNG) affichés dans le bandeau du haut, dans l'ordre. */
  partnerLogos?: (Uint8Array | null)[];
  /** Design officiel (image de fond + texte du bandeau, QR, photo et nom dynamiques). */
  variant?: DesignVariant;
  /** Fonction affichée sous le nom (badges d'accès). */
  jobTitle?: string | null;
  /** Titre en grand du badge générique. */
  title?: string;
  /** Photo du porteur (speakers). */
  photo?: Uint8Array | null;
}): Promise<Uint8Array> {
  if (params.variant) {
    const designed = await generateDesignBadge(params.variant, params);
    if (designed) return designed;
    // Image de fond introuvable : repli sur la mise en page historique ci-dessous.
  }

  const custom = await renderActiveTemplate("BADGE", params.editionId, {
    label: params.label,
    fullName: params.fullName,
    region: params.region,
    editionName: params.editionName,
    number: params.number,
    awardedAt: params.awardedAt.toLocaleDateString("fr-FR"),
  });
  if (custom) return custom;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const page = doc.addPage([WIDTH, HEIGHT]);
  const bg = hexToRgb(params.backgroundColor);
  // Le nom et le matricule sont écrits en blanc par défaut : si le fond du badge est clair
  // (proche du blanc), on bascule en texte sombre pour rester lisible.
  const bgLuminance = 0.299 * bg.red + 0.587 * bg.green + 0.114 * bg.blue;
  const bodyText = bgLuminance > 0.6 ? rgb(0.12, 0.12, 0.12) : WHITE;

  const centered = (text: string, y: number, size: number, usedFont: PDFFont, color = WHITE) => {
    const value = safe(text, usedFont);
    const width = usedFont.widthOfTextAtSize(value, size);
    page.drawText(value, { x: (WIDTH - width) / 2, y, size, font: usedFont, color });
  };

  // ─── Bandeau blanc du haut : logos partenaires ─────────────────────────────
  const topBandHeight = 54;
  page.drawRectangle({ x: 0, y: HEIGHT - topBandHeight, width: WIDTH, height: topBandHeight, color: WHITE });

  const logos = (params.partnerLogos ?? []).filter((buffer): buffer is Uint8Array => !!buffer);
  if (logos.length > 0) {
    const embedded: PDFImage[] = [];
    for (const buffer of logos) {
      try {
        embedded.push(await doc.embedPng(buffer));
      } catch {
        // Logo illisible : ignoré, les autres restent affichés.
      }
    }
    const maxLogoHeight = topBandHeight - 20;
    const slotWidth = WIDTH / embedded.length;
    embedded.forEach((image, index) => {
      const scale = Math.min(maxLogoHeight / image.height, (slotWidth - 14) / image.width);
      const w = image.width * scale;
      const h = image.height * scale;
      const slotX = slotWidth * index;
      page.drawImage(image, { x: slotX + (slotWidth - w) / 2, y: HEIGHT - topBandHeight + (topBandHeight - h) / 2, width: w, height: h });
    });
  }

  // ─── Corps : fond coloré ────────────────────────────────────────────────────
  const footerHeight = 46;
  const bandHeight = 34;
  const bodyTop = HEIGHT - topBandHeight;
  const bodyBottom = footerHeight + bandHeight;
  page.drawRectangle({ x: 0, y: bodyBottom, width: WIDTH, height: bodyTop - bodyBottom, color: bg });
  page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: footerHeight, color: bg });

  // Logo de la JNJL (rond, en haut à droite du corps)
  const logoSize = 66;
  const logoY = bodyTop - 16 - logoSize;
  if (params.logo) {
    try {
      const image = await doc.embedJpg(params.logo);
      page.drawImage(image, { x: WIDTH - 20 - logoSize, y: logoY, width: logoSize, height: logoSize });
    } catch {
      // Logo illisible : le badge reste valide sans lui.
    }
  }

  // Titre + édition + matricule, à gauche
  const leftX = 20;
  const titleSize = 13;
  page.drawText(safe("Journée Nationale", bold), { x: leftX, y: bodyTop - 24, size: titleSize, font: bold, color: ORANGE });
  page.drawText(safe("du Jeune Leader", bold), { x: leftX, y: bodyTop - 24 - titleSize - 2, size: titleSize, font: bold, color: ORANGE });

  // Le libellé de l'édition ne doit jamais chevaucher le logo (à droite) : s'il ne tient
  // pas sur une ligne à taille normale, il passe sur deux lignes plutôt que de devenir
  // minuscule (troncature avec « … » en tout dernier recours, si une ligne reste trop longue).
  const editionLabelMaxWidth = WIDTH - 20 - logoSize - 8 - leftX;
  const editionLabelRaw = safe(params.editionName, bold);
  const editionLabelOneLineSize = fitSize(editionLabelRaw, bold, editionLabelMaxWidth, 13, 11);
  const clampLine = (line: string, size: number) => {
    let text = line;
    while (bold.widthOfTextAtSize(text, size) > editionLabelMaxWidth && text.length > 1) {
      text = `${text.slice(0, -2)}…`;
    }
    return text;
  };
  let editionLabelLines: string[];
  let editionLabelSize: number;
  if (bold.widthOfTextAtSize(editionLabelRaw, editionLabelOneLineSize) <= editionLabelMaxWidth) {
    editionLabelLines = [editionLabelRaw];
    editionLabelSize = editionLabelOneLineSize;
  } else {
    const words = editionLabelRaw.split(" ");
    const half = Math.ceil(words.length / 2);
    editionLabelSize = 11;
    editionLabelLines = [
      clampLine(words.slice(0, half).join(" "), editionLabelSize),
      clampLine(words.slice(half).join(" "), editionLabelSize),
    ];
  }
  const editionLabelLineHeight = editionLabelSize + 3;
  const editionLabelBoxHeight = editionLabelSize + 5;
  const editionLabelWidth = Math.max(
    ...editionLabelLines.map(line => bold.widthOfTextAtSize(line, editionLabelSize))
  );
  const editionLabelY = bodyTop - 24 - (titleSize + 2) * 2 - 6;
  page.drawRectangle({
    x: leftX - 4,
    y: editionLabelY - 3 - (editionLabelLines.length - 1) * editionLabelLineHeight,
    width: editionLabelWidth + 8,
    height: editionLabelBoxHeight + (editionLabelLines.length - 1) * editionLabelLineHeight,
    color: WHITE,
  });
  editionLabelLines.forEach((line, index) => {
    page.drawText(line, {
      x: leftX,
      y: editionLabelY - index * editionLabelLineHeight,
      size: editionLabelSize,
      font: bold,
      color: rgb(0, 0, 0),
    });
  });
  const matriculeY =
    bodyTop - 24 - (titleSize + 2) * 2 - 26 - (editionLabelLines.length - 1) * editionLabelLineHeight;
  page.drawText(safe(`Matricule : ${params.number}`, mono), {
    x: leftX,
    y: matriculeY,
    size: 9,
    font: mono,
    color: bodyText,
  });

  // Identité : le nom se réduit (puis passe sur deux lignes) s'il est trop long
  const maxTextWidth = WIDTH - 40;
  const name = safe(params.fullName, bold);
  let cursor = logoY - 40;
  if (bold.widthOfTextAtSize(name, 12) > maxTextWidth * 1.5 || name.split(" ").length > 3) {
    const words = name.split(" ");
    const half = Math.ceil(words.length / 2);
    for (const line of [words.slice(0, half).join(" "), words.slice(half).join(" ")]) {
      centered(line, cursor, fitSize(line, bold, maxTextWidth, 16, 10), bold, bodyText);
      cursor -= 18;
    }
  } else {
    centered(name, cursor, fitSize(name, bold, maxTextWidth, 16, 10), bold, bodyText);
    cursor -= 18;
  }

  // QR code
  const qrSize = 88;
  const qrY = Math.max(bodyBottom + 10, cursor - 10 - qrSize);
  const qrDataUrl = await QRCode.toDataURL(params.qrValue ?? params.number, { margin: 1, width: 300 });
  const qr = await doc.embedPng(qrDataUrl.split(",")[1]!);
  page.drawRectangle({ x: (WIDTH - qrSize) / 2 - 5, y: qrY - 5, width: qrSize + 10, height: qrSize + 10, color: WHITE });
  page.drawImage(qr, { x: (WIDTH - qrSize) / 2, y: qrY, width: qrSize, height: qrSize });

  // ─── Bandeau orange : Ambassadeur + région ─────────────────────────────────
  const bandY = footerHeight;
  page.drawRectangle({ x: 0, y: bandY, width: WIDTH, height: bandHeight, color: ORANGE });
  const bandText = safe(params.label.replace(" JNJL", "").toUpperCase(), bold).split("").join(" ");
  const bandSize = 11;
  centered(bandText, bandY + bandHeight - 15, bandSize, bold);
  centered(safe(params.region, font), bandY + 7, 9, font);

  // ─── Pied : date, lieu et date de délivrance ────────────────────────────────
  let footerCursor = footerHeight - 14;
  if (params.eventDate) {
    centered(safe(params.eventDate, bold), footerCursor, 10, bold, ORANGE);
    footerCursor -= 13;
  }
  if (params.editionLocation) {
    centered(safe(params.editionLocation, font), footerCursor, 7.5, font, MUTED);
    footerCursor -= 11;
  }
  centered(`Délivré le ${params.awardedAt.toLocaleDateString("fr-FR")}`, Math.max(4, footerCursor), 6.5, font, MUTED);

  return doc.save();
}
