/**
 * Modèles de documents PDF éditables (pdfme) : types, variables disponibles et modèles par défaut.
 * Sans dépendance serveur : utilisé aussi bien par l'éditeur (navigateur) que par la génération.
 */

export type TemplateType = "ENGAGEMENT" | "CERTIFICATE" | "TRAINING_CERTIFICATE" | "BADGE";

export type TemplateVariable = {
  key: string;
  label: string;
  /** Valeur d'exemple pour l'aperçu de l'éditeur. */
  sample: string;
};

/** Modèle pdfme (schéma v6) : page(s) de blocs positionnés en millimètres. */
export type PdfmeTemplate = {
  basePdf: { width: number; height: number; padding: [number, number, number, number] };
  schemas: Record<string, unknown>[][];
};

type TypeDefinition = {
  label: string;
  description: string;
  /** Dimensions de la page en millimètres. */
  page: { width: number; height: number };
  variables: TemplateVariable[];
};

export const TEMPLATE_TYPES: Record<TemplateType, TypeDefinition> = {
  ENGAGEMENT: {
    label: "Fiche d'engagement",
    description: "PDF signé par l'ambassadeur (A4 portrait).",
    page: { width: 210, height: 297 },
    variables: [
      { key: "editionName", label: "Édition", sample: "JNJL 2026" },
      { key: "ambassadorName", label: "Nom de l'ambassadeur", sample: "Amina Issoufou" },
      { key: "region", label: "Région", sample: "Niamey" },
      {
        key: "engagementText",
        label: "Texte de l'engagement (saisi dans « Engagement »)",
        sample:
          "Je m'engage à représenter ma région avec dignité, à respecter le règlement de la JNJL et à participer activement à toutes les activités auxquelles je suis convoqué(e).",
      },
      { key: "signatureName", label: "Nom saisi comme signature", sample: "Amina Issoufou" },
      { key: "acceptedAt", label: "Date de signature", sample: "21/09/2026" },
    ],
  },
  CERTIFICATE: {
    label: "Attestation de participation",
    description: "Délivrée en fin de parcours (A4 paysage).",
    page: { width: 297, height: 210 },
    variables: [
      { key: "ambassadorName", label: "Nom de l'ambassadeur", sample: "Amina Issoufou" },
      { key: "region", label: "Région", sample: "Niamey" },
      { key: "editionName", label: "Édition", sample: "JNJL 2026" },
      { key: "badgeNumber", label: "Numéro du badge (pour le QR code)", sample: "JNJL-2026-0001" },
      { key: "issuedAt", label: "Date de délivrance", sample: "30/09/2026" },
    ],
  },
  TRAINING_CERTIFICATE: {
    label: "Attestation de formation",
    description: "Délivrée après une formation et son QCM (A4 paysage).",
    page: { width: 297, height: 210 },
    variables: [
      { key: "ambassadorName", label: "Nom de l'ambassadeur", sample: "Amina Issoufou" },
      { key: "region", label: "Région", sample: "Niamey" },
      { key: "editionName", label: "Édition", sample: "JNJL 2026" },
      { key: "courseTitle", label: "Titre de la formation", sample: "Leadership et engagement citoyen" },
      { key: "result", label: "Résultat (phrase prête à afficher)", sample: "et validé l'évaluation finale avec un score de 86 %." },
      { key: "scorePercent", label: "Score en %", sample: "86" },
      { key: "reference", label: "Référence (pour le QR code)", sample: "FORM-2026-A1B2C3D4" },
      { key: "issuedAt", label: "Date de délivrance", sample: "30/09/2026" },
    ],
  },
  BADGE: {
    label: "Badge",
    description: "Badge de conférence (A6 portrait).",
    page: { width: 105, height: 148 },
    variables: [
      { key: "label", label: "Intitulé du badge", sample: "AMBASSADEUR" },
      { key: "fullName", label: "Nom complet", sample: "Amina Issoufou" },
      { key: "region", label: "Région", sample: "Niamey" },
      { key: "editionName", label: "Édition", sample: "JNJL 2026" },
      { key: "number", label: "Numéro du badge (pour le QR code)", sample: "JNJL-2026-0001" },
      { key: "awardedAt", label: "Date d'attribution", sample: "21/09/2026" },
    ],
  },
};

export const TEMPLATE_TYPE_KEYS = Object.keys(TEMPLATE_TYPES) as TemplateType[];

export function isTemplateType(value: unknown): value is TemplateType {
  return typeof value === "string" && value in TEMPLATE_TYPES;
}

/** Valeurs d'exemple pour l'aperçu (variables du type → texte). */
export function sampleVariables(type: TemplateType): Record<string, string> {
  return Object.fromEntries(TEMPLATE_TYPES[type].variables.map(v => [v.key, v.sample]));
}

// ─── Modèles par défaut ──────────────────────────────────────────────────────

const INK = "#282828";
const ORANGE = "#F07321";
const GREEN = "#0DB02B";

type TextOptions = {
  name: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  fit?: boolean;
};

function textBlock(o: TextOptions): Record<string, unknown> {
  return {
    name: o.name,
    type: "text",
    content: o.content,
    readOnly: true,
    position: { x: o.x, y: o.y },
    width: o.width,
    height: o.height,
    fontSize: o.fontSize ?? 12,
    fontColor: o.color ?? INK,
    alignment: o.align ?? "left",
    verticalAlignment: "top",
    lineHeight: 1.3,
    characterSpacing: 0,
    backgroundColor: "",
    opacity: 1,
    ...(o.fit ? { dynamicFontSize: { min: 7, max: o.fontSize ?? 11, fit: "vertical" } } : {}),
  };
}

function frame(name: string, x: number, y: number, width: number, height: number, color: string, borderWidth: number) {
  return {
    name,
    type: "rectangle",
    position: { x, y },
    width,
    height,
    color: "",
    borderColor: color,
    borderWidth,
    radius: 0,
    opacity: 1,
    readOnly: true,
  };
}

function qrBlock(name: string, content: string, x: number, y: number, size: number) {
  return {
    name,
    type: "qrcode",
    content,
    readOnly: true,
    position: { x, y },
    width: size,
    height: size,
    backgroundColor: "#ffffff",
    barColor: "#000000",
    opacity: 1,
  };
}

/**
 * Modèle de départ reprenant la mise en page historique de chaque document.
 * `logoDataUrl` (facultatif) : logo JNJL intégré au modèle (fiche d'engagement et badge).
 */
export function defaultTemplate(type: TemplateType, logoDataUrl?: string | null): PdfmeTemplate {
  const { page } = TEMPLATE_TYPES[type];
  const basePdf: PdfmeTemplate["basePdf"] = { width: page.width, height: page.height, padding: [0, 0, 0, 0] };

  if (type === "ENGAGEMENT") {
    // Reprend la mise en page du document officiel (documents/ENGAGEMENT.docx) : le logo en
    // en-tête porte déjà la mention « Journée Nationale du Jeune Leader », donc pas de titre
    // dupliqué — le texte de la déclaration (engagementText) porte lui-même son propre titre.
    return {
      basePdf,
      schemas: [
        [
          ...(logoDataUrl
            ? [
                {
                  name: "logo",
                  type: "image",
                  content: logoDataUrl,
                  readOnly: true,
                  position: { x: 85, y: 12 },
                  width: 40,
                  height: 40,
                  opacity: 1,
                },
              ]
            : []),
          textBlock({ name: "edition", content: "{editionName}", x: 20, y: 56, width: 170, height: 8, fontSize: 13, color: ORANGE, align: "center" }),
          textBlock({ name: "identity", content: "Ambassadeur : {ambassadorName} ({region})", x: 20, y: 66, width: 170, height: 8, fontSize: 12, align: "center" }),
          textBlock({ name: "engagement", content: "{engagementText}", x: 20, y: 78, width: 170, height: 172, fontSize: 10.5, fit: true }),
          textBlock({ name: "signature", content: "Signé électroniquement par {signatureName}\nle {acceptedAt}", x: 20, y: 258, width: 170, height: 16, fontSize: 11 }),
        ],
      ],
    };
  }

  if (type === "CERTIFICATE" || type === "TRAINING_CERTIFICATE") {
    const isTraining = type === "TRAINING_CERTIFICATE";
    return {
      basePdf,
      schemas: [
        [
          frame("frame1", 8, 8, 281, 194, GREEN, 1.4),
          frame("frame2", 13, 13, 271, 184, ORANGE, 0.5),
          textBlock({ name: "org", content: "JOURNÉE NATIONALE DU JEUNE LEADER", x: 20, y: 26, width: 257, height: 8, fontSize: 14, color: GREEN, align: "center" }),
          textBlock({
            name: "title",
            content: isTraining ? "ATTESTATION DE FORMATION" : "ATTESTATION DE PARTICIPATION",
            x: 20, y: 44, width: 257, height: 14, fontSize: 28, align: "center",
          }),
          textBlock({ name: "intro", content: "Il est certifié que", x: 20, y: 66, width: 257, height: 8, fontSize: 13, align: "center" }),
          textBlock({ name: "person", content: "{ambassadorName}", x: 20, y: 80, width: 257, height: 14, fontSize: 28, color: ORANGE, align: "center" }),
          textBlock({
            name: "details",
            content: isTraining
              ? "Ambassadeur de la région de {region} ({editionName}),\na suivi avec succès la formation « {courseTitle} »\n{result}"
              : "Ambassadeur de la région de {region}, a pris part à la {editionName}\nen qualité d'Ambassadeur JNJL et a participé à l'ensemble du parcours.",
            x: 30, y: 104, width: 237, height: 28, fontSize: 13, align: "center",
          }),
          textBlock({ name: "place", content: "Fait à Niamey, le {issuedAt}", x: 20, y: 160, width: 257, height: 8, fontSize: 11, align: "center" }),
          qrBlock("qr", isTraining ? "{reference}" : "{badgeNumber}", 24, 158, 26),
        ],
      ],
    };
  }

  // BADGE
  const badgeBlocks: Record<string, unknown>[] = [
    frame("frame", 0.5, 0.5, 104, 147, "#D9D9DE", 0.4),
    {
      name: "band",
      type: "rectangle",
      position: { x: 0, y: 0 },
      width: 105,
      height: 22,
      color: ORANGE,
      borderColor: ORANGE,
      borderWidth: 0,
      radius: 0,
      opacity: 1,
      readOnly: true,
    },
    textBlock({ name: "label", content: "{label}", x: 5, y: 7, width: 95, height: 9, fontSize: 18, color: "#FFFFFF", align: "center" }),
    ...(logoDataUrl
      ? [
          {
            name: "logo",
            type: "image",
            content: logoDataUrl,
            readOnly: true,
            position: { x: 32.5, y: 28 },
            width: 40,
            height: 40,
            opacity: 1,
          },
        ]
      : []),
    textBlock({ name: "person", content: "{fullName}", x: 5, y: 74, width: 95, height: 14, fontSize: 18, align: "center", fit: true }),
    textBlock({ name: "region", content: "{region}", x: 5, y: 90, width: 95, height: 8, fontSize: 12, color: ORANGE, align: "center" }),
    textBlock({ name: "edition", content: "{editionName}", x: 5, y: 99, width: 95, height: 7, fontSize: 10, align: "center" }),
    qrBlock("qr", "{number}", 37.5, 108, 30),
    textBlock({ name: "number", content: "{number}", x: 5, y: 140, width: 95, height: 5, fontSize: 8, color: "#737373", align: "center" }),
  ];
  return { basePdf, schemas: [badgeBlocks] };
}
