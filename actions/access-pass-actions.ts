"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { generateBadgePdf, type DesignVariant } from "@/lib/generate-badge-pdf";
import { loadPublicImage, PARTNER_LOGO_PATHS } from "@/lib/badge-assets";
import { uploadFile } from "@/lib/upload";
import { storagePaths } from "@/lib/storage-paths";
import { categoryLabel, isAccessCategory } from "@/lib/access-categories";
import { nextAccessNumber, syncAccessPassQr } from "@/lib/access-pass";

const PERMISSION = "badges.manage";

/** Photo d'un porteur : lien absolu (R2) ou fichier local `/uploads/...`. Sans photo lisible, le badge reste valide. */
async function loadPhoto(url: string): Promise<Uint8Array | null> {
  try {
    if (/^https?:\/\//i.test(url)) {
      const response = await fetch(url);
      return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
    }
    return await loadPublicImage(url.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

export type AccessPassRow = {
  id: string;
  number: string;
  fullName: string;
  category: string;
  categoryLabel: string;
  organization: string | null;
  jobTitle: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  checkedInAt: Date | null;
  createdAt: Date;
};

const clean = (value: unknown, max: number): string | null => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
};

function toRow(pass: {
  id: string;
  number: string;
  fullName: string;
  category: string;
  organization: string | null;
  jobTitle: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  checkedInAt: Date | null;
  createdAt: Date;
}): AccessPassRow {
  return { ...pass, categoryLabel: categoryLabel(pass.category) };
}

/** Badges d'accès de l'édition, du plus récent au plus ancien. */
export async function listAccessPassesAction(editionId: string): Promise<AccessPassRow[]> {
  await requirePermission(PERMISSION);
  const passes = await db.accessPass.findMany({
    where: { editionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      fullName: true,
      category: true,
      organization: true,
      jobTitle: true,
      photoUrl: true,
      phone: true,
      email: true,
      status: true,
      checkedInAt: true,
      createdAt: true,
    },
  });
  return passes.map(toRow);
}

type PassInput = {
  fullName: string;
  category: string;
  organization?: string | null;
  jobTitle?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
};

async function createPass(editionId: string, editionYear: number, createdById: string, input: PassInput) {
  const fullName = clean(input.fullName, 150);
  if (!fullName) throw new Error("Le nom complet est obligatoire");
  if (!isAccessCategory(input.category)) throw new Error("Catégorie invalide");

  // Deux créations simultanées peuvent viser le même numéro : on réessaie avec le suivant.
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = await nextAccessNumber(editionId, editionYear);
    try {
      const pass = await db.accessPass.create({
        data: {
          editionId,
          category: input.category,
          fullName,
          organization: clean(input.organization, 150),
          jobTitle: clean(input.jobTitle, 150),
          photoUrl: clean(input.photoUrl, 500),
          phone: clean(input.phone, 40),
          email: clean(input.email, 200)?.toLowerCase() ?? null,
          number,
          createdById,
        },
      });
      const synced = await syncAccessPassQr(pass.id, true);
      return { pass, synced };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002") throw error;
    }
  }
  throw new Error("Impossible d'attribuer un numéro de badge, réessayez");
}

/** Ajoute une personne et génère son badge (QR ScanHub créé et actif). */
export async function createAccessPassAction(editionId: string, input: PassInput) {
  const actor = await requirePermission(PERMISSION);
  const edition = await db.edition.findUnique({ where: { id: editionId }, select: { year: true } });
  if (!edition) throw new Error("Édition introuvable");

  const { pass, synced } = await createPass(editionId, edition.year, actor.id, input);
  return { pass: toRow(pass), synced };
}

/**
 * Ajoute plusieurs personnes d'un coup : une personne par ligne, champs séparés par « ; » ou une
 * tabulation : Nom complet ; Organisation ; Fonction ; Téléphone ; Email. La catégorie est celle choisie.
 */
export async function createAccessPassesBulkAction(editionId: string, category: string, text: string) {
  const actor = await requirePermission(PERMISSION);
  if (!isAccessCategory(category)) throw new Error("Catégorie invalide");
  const edition = await db.edition.findUnique({ where: { id: editionId }, select: { year: true } });
  if (!edition) throw new Error("Édition introuvable");

  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 300);
  if (lines.length === 0) throw new Error("Aucune ligne à importer");

  let created = 0;
  let notSynced = 0;
  const errors: string[] = [];
  for (const line of lines) {
    const [fullName, organization, jobTitle, phone, email] = line.split(/[;\t]/).map(part => part.trim());
    try {
      const { synced } = await createPass(editionId, edition.year, actor.id, {
        fullName: fullName ?? "",
        category,
        organization,
        jobTitle,
        phone,
        email,
      });
      created += 1;
      if (!synced) notSynced += 1;
    } catch (error) {
      errors.push(`« ${line.slice(0, 40)} » : ${error instanceof Error ? error.message : "erreur"}`);
    }
  }
  return { created, notSynced, errors };
}

/** Modifie les informations d'un badge d'accès (le numéro et le QR ne changent pas). */
export async function updateAccessPassAction(passId: string, input: PassInput) {
  await requirePermission(PERMISSION);
  const pass = await db.accessPass.findUnique({ where: { id: passId }, select: { id: true } });
  if (!pass) throw new Error("Badge introuvable");

  const fullName = clean(input.fullName, 150);
  if (!fullName) throw new Error("Le nom complet est obligatoire");
  if (!isAccessCategory(input.category)) throw new Error("Catégorie invalide");

  const updated = await db.accessPass.update({
    where: { id: passId },
    data: {
      category: input.category,
      fullName,
      organization: clean(input.organization, 150),
      jobTitle: clean(input.jobTitle, 150),
      photoUrl: clean(input.photoUrl, 500),
      phone: clean(input.phone, 40),
      email: clean(input.email, 200)?.toLowerCase() ?? null,
    },
  });
  return { pass: toRow(updated) };
}

/** Téléverse la photo d'un porteur de badge (JPEG ou PNG, 4 Mo max) et renvoie son adresse. */
export async function uploadAccessPhotoAction(formData: FormData) {
  await requirePermission(PERMISSION);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Aucun fichier fourni");

  const uploaded = await uploadFile(file, {
    maxSize: 4 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png"],
    destination: storagePaths.speakerPhoto(),
  });
  return { url: uploaded.path };
}

/** Révoque (le QR est refusé à l'entrée) ou rétablit un badge d'accès. */
export async function setAccessPassStatusAction(passId: string, active: boolean) {
  await requirePermission(PERMISSION);
  const pass = await db.accessPass.findUnique({ where: { id: passId }, select: { id: true } });
  if (!pass) throw new Error("Badge introuvable");

  await db.accessPass.update({ where: { id: passId }, data: { status: active ? "ACTIF" : "REVOQUE" } });
  const synced = await syncAccessPassQr(passId, active);
  return { status: active ? "ACTIF" : "REVOQUE", synced };
}

/** Badge PDF (A6, imprimable) d'une personne, encodé en base64. */
export async function downloadAccessPassBadgeAction(passId: string) {
  await requirePermission(PERMISSION);
  const pass = await db.accessPass.findUnique({
    where: { id: passId },
    include: { edition: true },
  });
  if (!pass) throw new Error("Badge introuvable");

  // Un QR non encore créé côté ScanHub (injoignable à l'ajout) est rejoué avant l'impression.
  let qrCode = pass.qrCode;
  if (!qrCode || qrCode === pass.number) {
    await syncAccessPassQr(pass.id, pass.status === "ACTIF");
    qrCode = (await db.accessPass.findUnique({ where: { id: pass.id }, select: { qrCode: true } }))?.qrCode ?? null;
  }

  const edition = pass.edition;
  const eventDate =
    edition.startDate && edition.endDate
      ? edition.startDate.getTime() === edition.endDate.getTime()
        ? edition.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
        : `${edition.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${edition.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
      : null;

  // Catégories qui ont une maquette officielle ; les autres gardent la mise en page historique.
  const variantByCategory: Record<string, DesignVariant | undefined> = {
    POINT_FOCAL: "point_focal",
    COMMISSION: "commission",
    INTERVENANT: "speaker",
    MEDIA: "generic",
    COMITE_ORGANISATION: "generic",
    PERSONNEL_APPUI: "generic",
    INVITE: "generic",
    AUTRE: "generic",
  };
  // Titre en grand du modèle générique (le modèle « Point focal » sans titre).
  const genericTitles: Record<string, string> = {
    MEDIA: "Média",
    COMITE_ORGANISATION: "Comité d'organisation",
    PERSONNEL_APPUI: "Personnel d'appui",
    INVITE: "Invité",
    AUTRE: "Accès",
  };
  const photo = pass.photoUrl ? await loadPhoto(pass.photoUrl) : null;

  const pdf = await generateBadgePdf({
    editionId: edition.id,
    label: categoryLabel(pass.category),
    variant: variantByCategory[pass.category],
    title: genericTitles[pass.category],
    jobTitle: pass.jobTitle,
    photo,
    fullName: pass.fullName,
    region:
      pass.organization ?? (pass.category === "POINT_FOCAL" ? "Niger" : pass.category === "COMMISSION" ? "Commission" : "JNJL 2026"),
    editionName: `${edition.name} (${edition.year})`,
    editionLocation: edition.location,
    eventDate,
    backgroundColor: edition.badgeBackgroundColor,
    number: pass.number,
    qrValue: qrCode ?? pass.number,
    awardedAt: pass.createdAt,
    logo: await loadPublicImage("jnjl.jpg"),
    partnerLogos: await Promise.all(PARTNER_LOGO_PATHS.map(loadPublicImage)),
  });

  return {
    filename: `badge-${pass.number}.pdf`,
    base64: Buffer.from(pdf).toString("base64"),
  };
}
