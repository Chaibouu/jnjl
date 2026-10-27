import { NextRequest, NextResponse, after } from "next/server";
import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { eventApplicationSchema } from "@/schemas/event-application";
import { RegistrationError, registerParticipant, syncParticipantQr } from "@/lib/participant-registration";
import { rateLimitRedis } from "@/lib/rateLimit-redis";
import { getClientIP } from "@/lib/geo";
import { getRegistrationState } from "@/lib/site-settings";
import { sendParticipantBadgeEmail } from "@/lib/mail";

/**
 * Inscriptions à l'événement : jusqu'à 60 envois par heure et par adresse IP. C'est volontairement plus large que la
 * limite des e-mails d'authentification : une salle ou un campus partage souvent la même IP.
 */
const EVENT_APPLICATION_LIMIT = { windowMs: 60 * 60 * 1000, max: 60 };

export async function POST(request: NextRequest) {
  try {
    const registration = await getRegistrationState();
    // Fermé par l'administrateur : on refuse même si quelqu'un envoie la requête sans passer par la page.
    if (!registration.participantsOpen) {
      return NextResponse.json({ error: "Les inscriptions ne sont pas ouvertes pour le moment." }, { status: 403 });
    }

    const rateLimitResponse = await rateLimitRedis(`event-application:${getClientIP(request)}`, EVENT_APPLICATION_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    const parsed = eventApplicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Veuillez corriger les champs du formulaire",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();

    const edition = await db.edition.findFirst({
      where: { status: EditionStatus.ACTIVE, isDeleted: false },
      orderBy: { year: "desc" },
    });
    if (!edition) {
      return NextResponse.json({ error: "Cette édition n'accepte pas actuellement les candidatures" }, { status: 400 });
    }

    const region = await db.region.findUnique({ where: { id: data.regionId } });
    if (!region) {
      return NextResponse.json({ error: "La région sélectionnée est invalide" }, { status: 400 });
    }

    // Places limitées par l'administrateur (0 = illimité).
    if (registration.participantsCapacity > 0) {
      const registered = await db.eventApplication.count({ where: { editionId: edition.id } });
      if (registered >= registration.participantsCapacity) {
        return NextResponse.json({ error: "Les inscriptions sont closes : toutes les places sont prises." }, { status: 403 });
      }
    }

    // Rattache la candidature au compte existant si le visiteur est connecté.
    const session = await getUser();
    const userId = session?.user?.user?.id ?? null;

    // Plus de validation admin : l'inscription vaut confirmation immédiate de participation (§8 du guide admin),
    // avec attribution du badge dans la foulée (candidature et badge créés ensemble).
    const result = await registerParticipant({
      editionId: edition.id,
      editionYear: edition.year,
      userId,
      regionId: data.regionId,
      firstName: data.firstName,
      lastName: data.lastName,
      email,
      phone: data.phone,
      gender: data.gender,
      profession: data.profession,
      hasParticipatedBefore: data.hasParticipatedBefore,
      motivation: data.motivation?.trim() || null,
    });

    // QR ScanHub du badge (réutilisable) : ne bloque jamais l'inscription.
    await syncParticipantQr(result.participationId, `${data.firstName} ${data.lastName}`);

    // E-mail de confirmation avec le lien du badge : envoyé après la réponse, un échec ne change rien à l'inscription.
    after(async () => {
      try {
        await sendParticipantBadgeEmail(email, data.firstName, result.applicationId, result.badgeNumber);
      } catch (error) {
        console.error("E-mail de confirmation participant non envoyé:", error);
      }
    });

    return NextResponse.json(
      { success: true, applicationId: result.applicationId, badgeNumber: result.badgeNumber },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Erreur candidature participant:", error);
    return NextResponse.json({ error: "Impossible d'enregistrer la candidature" }, { status: 500 });
  }
}
