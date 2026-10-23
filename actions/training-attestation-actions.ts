"use server";

import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { ForbiddenError } from "@/lib/forbidden-error";
import { generateInPersonTrainingCertificatePdf } from "@/lib/generate-certificate-pdf";
import type { User } from "@/types/user";

/**
 * Attestation de formation en libre-service : tout ambassadeur dont le staff de sa région a validé la présence
 * à la formation (liste de présence) peut la télécharger depuis « Mes documents ». Générée à la demande, avec une
 * référence stable (la même à chaque téléchargement).
 */

async function loadEligibleApplication() {
  const result = await getUser();
  const user = result?.user?.user as User | undefined;
  if (!user) throw new ForbiddenError("Authentification requise");

  const edition = await db.edition.findFirst({ where: { status: "ACTIVE", isDeleted: false } });
  if (!edition) return null;

  const application = await db.ambassadorApplication.findFirst({
    where: { userId: user.id, editionId: edition.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      inPersonTrainingAt: true,
      region: { select: { name: true } },
      payment: { select: { status: true } },
    },
  });
  if (!application) return null;
  return { edition, application };
}

/** État de l'attestation de l'ambassadeur connecté (page « Attestation de formation »). */
export async function getMyTrainingAttestationStatusAction() {
  const context = await loadEligibleApplication();
  if (!context) return null;
  const { edition, application } = context;
  return {
    editionName: `${edition.name} (${edition.year})`,
    available: application.status === "RETENU" && application.payment?.status === "VALIDE" && !!application.inPersonTrainingAt,
    validatedAt: application.inPersonTrainingAt,
  };
}

/** Génère l'attestation de formation (PDF encodé en base64). */
export async function downloadMyTrainingAttestationAction(): Promise<
  { ok: true; filename: string; base64: string } | { ok: false; error: string }
> {
  const context = await loadEligibleApplication();
  if (!context) return { ok: false, error: "Aucune candidature ambassadeur trouvée pour votre compte" };
  const { edition, application } = context;

  if (application.status !== "RETENU" || application.payment?.status !== "VALIDE" || !application.inPersonTrainingAt) {
    return {
      ok: false,
      error: "Votre attestation sera disponible dès que le staff de votre région aura validé votre présence à la formation.",
    };
  }

  const reference = `FORM-${edition.year}-${application.id.slice(-8).toUpperCase()}`;
  const pdf = await generateInPersonTrainingCertificatePdf({
    editionId: edition.id,
    ambassadorName: `${application.firstName} ${application.lastName}`,
    region: application.region.name,
    editionName: `${edition.name} (${edition.year})`,
    trainingDate: application.inPersonTrainingAt,
    reference,
    issuedAt: new Date(),
  });

  return { ok: true, filename: `attestation-formation-${reference}.pdf`, base64: Buffer.from(pdf).toString("base64") };
}
