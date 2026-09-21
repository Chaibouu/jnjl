import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

const PAGE_WIDTH = 841.89; // A4 paysage, points
const PAGE_HEIGHT = 595.28;

const GREEN = rgb(0.05, 0.69, 0.17); // #0DB02B
const ORANGE = rgb(0.88, 0.32, 0.02); // #E05206
const DARK = rgb(0.12, 0.12, 0.12);

type CertificateLayout = {
  title: string;
  intro: string;
  name: string;
  /** Lignes descriptives centrées sous le nom. */
  lines: string[];
  issuedAt: Date;
  /** Numéro encodé dans le QR code (badge, référence…). */
  qrValue: string | null;
};

async function renderCertificate(layout: CertificateLayout): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const centered = (
    text: string,
    y: number,
    size: number,
    options: { font?: typeof font; color?: ReturnType<typeof rgb> } = {}
  ) => {
    const usedFont = options.font ?? font;
    const width = usedFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (PAGE_WIDTH - width) / 2,
      y,
      size,
      font: usedFont,
      color: options.color ?? DARK,
    });
  };

  // Double cadre aux couleurs de la charte
  page.drawRectangle({ x: 24, y: 24, width: PAGE_WIDTH - 48, height: PAGE_HEIGHT - 48, borderColor: GREEN, borderWidth: 4 });
  page.drawRectangle({ x: 36, y: 36, width: PAGE_WIDTH - 72, height: PAGE_HEIGHT - 72, borderColor: ORANGE, borderWidth: 1.5 });

  centered("JOURNÉE NATIONALE DU JEUNE LEADER", PAGE_HEIGHT - 95, 14, { font: bold, color: GREEN });
  centered(layout.title, PAGE_HEIGHT - 150, 30, { font: bold });
  centered(layout.intro, PAGE_HEIGHT - 205, 13, { font: italic });
  centered(layout.name, PAGE_HEIGHT - 255, 28, { font: bold, color: ORANGE });
  layout.lines.forEach((line, index) => centered(line, PAGE_HEIGHT - 300 - index * 20, 13));

  centered(`Fait à Niamey, le ${layout.issuedAt.toLocaleDateString("fr-FR")}`, 130, 11);

  if (layout.qrValue) {
    const qrDataUrl = await QRCode.toDataURL(layout.qrValue, { margin: 1, width: 160 });
    const qrImage = await doc.embedPng(qrDataUrl.split(",")[1]!);
    page.drawImage(qrImage, { x: 70, y: 60, width: 70, height: 70 });
    page.drawText(layout.qrValue, { x: 70, y: 48, size: 8, font, color: DARK });
  }

  return doc.save();
}

/** Attestation de participation à l'événement (fin du parcours ambassadeur). */
export async function generateCertificatePdf(params: {
  ambassadorName: string;
  region: string;
  editionName: string;
  badgeNumber: string | null;
  issuedAt: Date;
}): Promise<Uint8Array> {
  return renderCertificate({
    title: "ATTESTATION DE PARTICIPATION",
    intro: "Il est certifié que",
    name: params.ambassadorName,
    lines: [
      `Ambassadeur de la région de ${params.region}, a pris part à la ${params.editionName}`,
      "en qualité d'Ambassadeur JNJL et a participé à l'ensemble du parcours.",
    ],
    issuedAt: params.issuedAt,
    qrValue: params.badgeNumber,
  });
}

/** Attestation de formation : formation terminée et QCM lié(s) réussi(s). */
export async function generateTrainingCertificatePdf(params: {
  ambassadorName: string;
  region: string;
  editionName: string;
  courseTitle: string;
  /** Meilleur score obtenu aux QCM liés (en %), s'il y en a. */
  scorePercent: number | null;
  reference: string;
  issuedAt: Date;
}): Promise<Uint8Array> {
  return renderCertificate({
    title: "ATTESTATION DE FORMATION",
    intro: "Il est certifié que",
    name: params.ambassadorName,
    lines: [
      `Ambassadeur de la région de ${params.region} (${params.editionName}),`,
      `a suivi avec succès la formation « ${params.courseTitle} »`,
      params.scorePercent != null
        ? `et validé l'évaluation finale avec un score de ${Math.round(params.scorePercent)} %.`
        : "et validé l'ensemble de ses modules.",
    ],
    issuedAt: params.issuedAt,
    qrValue: params.reference,
  });
}
