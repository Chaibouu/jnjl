import { NextRequest, NextResponse } from "next/server";
import { EditionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ambassadorApplicationSchema } from "@/schemas/ambassador-application";
import { rateLimitRedisEmail } from "@/lib/rateLimit";
import { getClientIP } from "@/lib/geo";

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimitRedisEmail(getClientIP(request));
    if (rateLimitResponse) return rateLimitResponse;

    const parsed = ambassadorApplicationSchema.safeParse(await request.json());
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
    const [edition, region] = await Promise.all([
      db.edition.findFirst({
        where: { status: EditionStatus.ACTIVE, isDeleted: false },
        orderBy: { year: "desc" },
      }),
      db.region.findUnique({ where: { id: data.regionId } }),
    ]);

    if (!edition)
      return NextResponse.json(
        { error: "Cette édition n'accepte pas actuellement les candidatures" },
        { status: 400 }
      );
    if (!region)
      return NextResponse.json(
        { error: "La région sélectionnée est invalide" },
        { status: 400 }
      );
    const existingApplication = await db.ambassadorApplication.findFirst({
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

    const application = await db.ambassadorApplication.create({
      data: {
        editionId: edition.id,
        regionId: region.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        phone: data.phone,
        gender: data.gender,
        birthDate: new Date(data.birthDate),
        birthPlace: data.birthPlace,
        educationLevel: data.educationLevel,
        hasDisability: data.hasDisability,
        disabilityDetails: data.disabilityDetails?.trim() || null,
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
    console.error("Erreur candidature ambassadeur:", error);
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
