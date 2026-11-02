import { db } from "@/lib/db";
import { generateBadgePdf } from "@/lib/generate-badge-pdf";
import { loadPublicImage, PARTNER_LOGO_PATHS } from "@/lib/badge-assets";
import { loadBadgePhoto } from "@/lib/badge-photo";

/** Données du badge d'un participant. Lève si l'inscription est introuvable, annulée ou sans badge. */
async function loadParticipantBadgeData(applicationId: string) {
  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    include: {
      edition: true,
      region: { select: { name: true } },
      participation: true,
    },
  });
  if (!application || !application.participation?.badgeNumber || application.cancelledAt) {
    throw new Error("Badge introuvable");
  }

  const edition = application.edition;
  const eventDate =
    edition.startDate && edition.endDate
      ? edition.startDate.getTime() === edition.endDate.getTime()
        ? edition.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
        : `${edition.startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${edition.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
      : null;

  return {
    fullName: `${application.firstName} ${application.lastName}`,
    region: application.region?.name ?? "Niger",
    editionId: edition.id,
    editionName: `${edition.name} (${edition.year})`,
    editionLocation: edition.location,
    eventDate,
    badgeBackgroundColor: edition.badgeBackgroundColor,
    photoUrl: application.photoUrl,
    number: application.participation.badgeNumber,
    qrValue: application.participation.qrCode ?? application.participation.badgeNumber,
    awardedAt: application.participation.createdAt,
  };
}

/**
 * Badge PDF (A6) d'un participant. Même badge officiel dans les deux cas : avec photo, elle est dans le cercle ; sans
 * photo, le grand logo de la JNJL prend sa place. Le QR est à côté. Lève en cas d'échec : l'appelant décide quoi dire.
 */
export async function buildParticipantBadgePdf(applicationId: string) {
  const data = await loadParticipantBadgeData(applicationId);
  const photo = await loadBadgePhoto(data.photoUrl);
  const pdf = await generateBadgePdf({
    editionId: data.editionId,
    variant: photo ? ("generic" as const) : ("participant" as const),
    title: "PARTICIPANT",
    ...(photo ? { photo } : {}),
    label: "Participant JNJL",
    fullName: data.fullName,
    region: data.region,
    editionName: data.editionName,
    editionLocation: data.editionLocation,
    eventDate: data.eventDate,
    backgroundColor: data.badgeBackgroundColor,
    number: data.number,
    awardedAt: data.awardedAt,
    qrValue: data.qrValue,
    logo: await loadPublicImage("jnjl.jpg"),
    partnerLogos: await Promise.all(PARTNER_LOGO_PATHS.map(loadPublicImage)),
  });

  return {
    filename: `badge-${data.number}.pdf`,
    base64: Buffer.from(pdf).toString("base64"),
  };
}
