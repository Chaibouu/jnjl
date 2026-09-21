import { NextRequest, NextResponse } from "next/server";
import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/actions/getUser";
import { eventApplicationSchema } from "@/schemas/event-application";
import { rateLimitRedisEmail } from "@/lib/rateLimit";
import { getClientIP } from "@/lib/geo";

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimitRedisEmail(getClientIP(request));
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
      return NextResponse.json(
        { error: "Cette édition n'accepte pas actuellement les candidatures" },
        { status: 400 }
      );
    }

    if (data.regionId) {
      const region = await db.region.findUnique({ where: { id: data.regionId } });
      if (!region) {
        return NextResponse.json(
          { error: "La région sélectionnée est invalide" },
          { status: 400 }
        );
      }
    }

    const existingApplication = await db.eventApplication.findFirst({
      where: { editionId: edition.id, email },
      select: { status: true },
    });
    if (existingApplication && existingApplication.status !== "NON_RETENU") {
      return NextResponse.json(
        {
          error: "Une candidature existe déjà pour cet email et cette édition.",
        },
        { status: 409 }
      );
    }

    // Rattache la candidature au compte existant si le visiteur est connecté.
    const session = await getUser();
    const userId = session?.user?.user?.id ?? null;

    const application = await db.eventApplication.create({
      data: {
        editionId: edition.id,
        userId,
        regionId: data.regionId || null,
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        phone: data.phone,
        gender: data.gender,
        motivation: data.motivation?.trim() || null,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { success: true, applicationId: application.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: "Une candidature existe déjà pour ce compte et cette édition",
        },
        { status: 409 }
      );
    }
    console.error("Erreur candidature participant:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la candidature" },
      { status: 500 }
    );
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
