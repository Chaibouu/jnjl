"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { ForbiddenError } from "@/lib/forbidden-error";
import { saveFile } from "@/lib/storage";
import { storagePaths } from "@/lib/storage-paths";
import { fillDocxTemplate, DOCX_MIME } from "@/lib/document-templates/fill";
import type { User } from "@/types/user";

/**
 * Demande de permission et ordre de mission : en libre-service pour l'ambassadeur,
 * disponibles dès que sa fiche d'engagement est signée (§ pipeline ambassadeur). Le
 * document Word officiel (en-tête, signature) sert de modèle — seuls les champs
 * variables sont remplis, aucune conversion PDF (pas de LibreOffice sur Vercel).
 */

async function getCurrentUser(): Promise<User> {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");
  return user;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const formatDate = (date: Date) => date.toLocaleDateString("fr-FR", DATE_FORMAT);

/** Reprise si l'admin n'a pas renseigné la clause de patronage de l'édition. */
const PATRONAGE_FALLBACK =
  "sous le Haut Patronage de la Première Dame du Niger, Présidente de la Fondation Guri Vie Meilleure, HADJIA AÏSSATA ISSOUFOU.";

/** Reprend le format d'origine des documents Word (numéro séquentiel + année en cours). */
const REFERENCE_FORMAT = {
  PERMISSION_REQUEST: { digits: 4, suffix: (year: number) => `/${year}/LA/AMG/AAF`, build: (n: string, year: number) => `${n}/${year}/LA/AMG/AAF` },
  MISSION_ORDER: { digits: 3, suffix: (year: number) => `/LA/AM/RH/${year}`, build: (n: string, year: number) => `${n}/LA/AM/RH/${year}` },
} as const;

/**
 * Référence affichée sur le document : un numéro qui s'incrémente à chaque nouvelle candidature
 * (par type, sur l'année en cours), stable d'une régénération à l'autre — un document déjà émis
 * garde toujours le même numéro.
 */
async function resolveReference(
  applicationId: string,
  type: "PERMISSION_REQUEST" | "MISSION_ORDER",
  year: number
): Promise<string> {
  const existing = await db.document.findFirst({
    where: { ambassadorApplicationId: applicationId, type },
    select: { reference: true },
  });
  if (existing?.reference) return existing.reference;

  const format = REFERENCE_FORMAT[type];
  const count = await db.document.count({
    where: { type, reference: { endsWith: format.suffix(year) } },
  });
  return format.build(String(count + 1).padStart(format.digits, "0"), year);
}

async function loadContext(user: User) {
  const editionRecord = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!editionRecord) throw new Error("Aucune édition active");

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: editionRecord.id },
    include: {
      engagement: { select: { id: true } },
      documents: { where: { type: { in: ["PERMISSION_REQUEST", "MISSION_ORDER"] } } },
    },
  });
  if (!application) throw new Error("Aucune candidature ambassadeur trouvée pour votre compte");
  if (!application.engagement) {
    throw new Error("Ces documents sont disponibles après la signature de votre fiche d'engagement");
  }
  if (!editionRecord.startDate) {
    throw new Error("La date de l'édition n'est pas encore renseignée par l'administration");
  }

  // Édition sur un seul jour : la date de fin est facultative, elle vaut alors la date de début.
  const startDate = editionRecord.startDate;
  const endDate = editionRecord.endDate ?? startDate;
  // Dates spécifiques à l'ordre de mission / à l'autorisation d'absence (réglages > Paramètres)
  // — repli sur les dates de l'édition si l'admin ne les a pas renseignées séparément.
  const missionDepartureDate = editionRecord.missionDepartureDate ?? startDate;
  const missionReturnDate = editionRecord.missionReturnDate ?? endDate;
  const absenceStartDate = editionRecord.absenceStartDate ?? startDate;
  const absenceEndDate = editionRecord.absenceEndDate ?? endDate;
  const edition = {
    ...editionRecord,
    startDate,
    endDate,
    missionDepartureDate,
    missionReturnDate,
    absenceStartDate,
    absenceEndDate,
  };

  const profile = await db.userProfile.findUnique({
    where: { userId: user.id },
    select: { institution: true, educationLevel: true },
  });

  return { edition, application, profile };
}

/** "21 novembre 2026" (un jour) ou "28 septembre 2026 et 30 septembre 2026" (plusieurs jours), pour la phrase officielle. */
function formatPeriode(startDate: Date, endDate: Date): string {
  return startDate.getTime() === endDate.getTime()
    ? formatDate(startDate)
    : `${formatDate(startDate)} et ${formatDate(endDate)}`;
}

/** "d'une journée, le 21 novembre 2026" ou "de 3 jours, du 28 septembre 2026 au 30 septembre 2026". */
function formatDureeTexte(startDate: Date, endDate: Date, days: number): string {
  return startDate.getTime() === endDate.getTime()
    ? `d'une journée, le ${formatDate(startDate)}`
    : `de ${days} jours, du ${formatDate(startDate)} au ${formatDate(endDate)}`;
}

/** "le 21 novembre 2026" (un jour) ou "du 28 septembre 2026 au 30 septembre 2026" (plusieurs jours). */
function formatDateRange(startDate: Date, endDate: Date): string {
  return startDate.getTime() === endDate.getTime()
    ? `le ${formatDate(startDate)}`
    : `du ${formatDate(startDate)} au ${formatDate(endDate)}`;
}

/** Données pour préremplir les deux formulaires (établissement, niveau, dates de l'édition…). */
export async function getMyDocumentFormDataAction() {
  const user = await getCurrentUser();
  const { edition, application, profile } = await loadContext(user);

  const days =
    Math.round(
      (edition.absenceEndDate.getTime() - edition.absenceStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return {
    fullName: `${application.firstName} ${application.lastName}`,
    institution: profile?.institution ?? "",
    educationLevel: application.educationLevel ?? profile?.educationLevel ?? "",
    editionName: edition.name,
    absenceDates: formatDateRange(edition.absenceStartDate, edition.absenceEndDate),
    missionDates: formatDateRange(edition.missionDepartureDate, edition.missionReturnDate),
    durationDays: days,
    location: edition.location ?? "Niamey",
    permissionRequest: application.documents.find(doc => doc.type === "PERMISSION_REQUEST") ?? null,
    missionOrder: application.documents.find(doc => doc.type === "MISSION_ORDER") ?? null,
  };
}

async function saveGeneratedDocument(params: {
  userId: string;
  applicationId: string;
  editionYear: number;
  type: "PERMISSION_REQUEST" | "MISSION_ORDER";
  reference: string;
  buffer: Buffer;
}) {
  const fileUrl = await saveFile({
    folder: storagePaths.document(params.editionYear),
    filename: `${randomBytes(8).toString("hex")}.docx`,
    body: new Uint8Array(params.buffer),
    contentType: DOCX_MIME,
  });

  // Un seul document par type et par candidature : la régénération remplace le précédent
  // (mais garde le même numéro de référence — voir resolveReference).
  await db.document.deleteMany({
    where: { ambassadorApplicationId: params.applicationId, type: params.type },
  });
  await db.document.create({
    data: {
      type: params.type,
      fileUrl,
      reference: params.reference,
      userId: params.userId,
      ambassadorApplicationId: params.applicationId,
    },
  });

  return fileUrl;
}

function genderWording(gender: string | null | undefined) {
  const feminine = gender === "FEMININ";
  return {
    qualite: feminine ? "étudiante" : "étudiant",
    inscription: feminine ? "inscrite" : "inscrit",
    qualite_accord: feminine ? "sélectionnée" : "sélectionné",
  };
}

export async function generateMyPermissionRequestAction(input: {
  destinataireTitre: string;
  civilite: "Monsieur" | "Madame";
  etablissement: string;
  niveau: string;
}) {
  const user = await getCurrentUser();
  const { edition, application } = await loadContext(user);

  const destinataireTitre = input.destinataireTitre.trim();
  const etablissement = input.etablissement.trim();
  const niveau = input.niveau.trim();
  if (destinataireTitre.length < 3) throw new Error("Précisez le destinataire (ex. Monsieur le Directeur Général)");
  if (etablissement.length < 2) throw new Error("Précisez le nom de l'établissement");
  if (niveau.length < 2) throw new Error("Précisez votre niveau ou votre filière");
  if (!["Monsieur", "Madame"].includes(input.civilite)) throw new Error("Civilité invalide");

  const days =
    Math.round(
      (edition.absenceEndDate.getTime() - edition.absenceStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const reference = await resolveReference(application.id, "PERMISSION_REQUEST", edition.year);

  const buffer = fillDocxTemplate("permission-request", {
    date_lettre: formatDate(new Date()),
    reference,
    destinataire_titre: destinataireTitre,
    etablissement,
    civilite: input.civilite,
    nom_ambassadeur: `${application.firstName} ${application.lastName}`,
    niveau,
    duree_texte: formatDureeTexte(edition.absenceStartDate, edition.absenceEndDate, days),
    periode: formatPeriode(edition.startDate, edition.endDate),
    edition_nom: `la Journée Nationale du Jeune Leader (${edition.name})`,
    lieu: edition.location ?? "Niamey",
    patronage: edition.patronageText?.trim() || PATRONAGE_FALLBACK,
    ...genderWording(application.gender),
  });

  const fileUrl = await saveGeneratedDocument({
    userId: user.id,
    applicationId: application.id,
    editionYear: edition.year,
    type: "PERMISSION_REQUEST",
    reference,
    buffer,
  });

  return { fileUrl };
}

export async function generateMyMissionOrderAction(input: {
  etablissement: string;
  moyenTransport: string;
  financement: string;
}) {
  const user = await getCurrentUser();
  const { edition, application } = await loadContext(user);

  const etablissement = input.etablissement.trim();
  const moyenTransport = input.moyenTransport.trim();
  const financement = input.financement.trim();
  if (etablissement.length < 2) throw new Error("Précisez le nom de l'établissement");
  if (moyenTransport.length < 2) throw new Error("Précisez le moyen de transport");
  if (financement.length < 2) throw new Error("Précisez le financement");

  const reference = await resolveReference(application.id, "MISSION_ORDER", edition.year);

  const buffer = fillDocxTemplate("mission-order", {
    reference,
    nom_ambassadeur: `${application.firstName} ${application.lastName}`,
    fonction: "Ambassadeur JNJL",
    etablissement,
    motif: `Participation à la ${edition.name}`,
    destination: edition.location ?? "Niamey",
    date_debut: formatDate(edition.missionDepartureDate),
    date_fin: formatDate(edition.missionReturnDate),
    moyen_transport: moyenTransport,
    financement,
    date_lettre: formatDate(new Date()),
  });

  const fileUrl = await saveGeneratedDocument({
    userId: user.id,
    applicationId: application.id,
    editionYear: edition.year,
    type: "MISSION_ORDER",
    reference,
    buffer,
  });

  return { fileUrl };
}
