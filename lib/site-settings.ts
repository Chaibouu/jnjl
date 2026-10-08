import { db } from "@/lib/db";

/** Clés des réglages (table `settings`) qui ouvrent ou ferment les candidatures du site public. */
export const REGISTRATION_KEYS = {
  ambassadorsOpen: "site.ambassador_applications_open",
  ambassadorsNote: "site.ambassador_applications_note",
  participantsOpen: "site.participant_registration_open",
  participantsNote: "site.participant_registration_note",
} as const;

export type RegistrationState = {
  /** Candidatures ambassadeurs ouvertes (par défaut : oui). */
  ambassadorsOpen: boolean;
  /** Inscriptions des participants à l'événement ouvertes (par défaut : non, tant que l'administrateur ne les ouvre pas). */
  participantsOpen: boolean;
  /** Message libre affiché quand c'est fermé (ex. « Ouverture prévue en novembre »). */
  ambassadorsNote: string;
  participantsNote: string;
};

const DEFAULTS: RegistrationState = {
  ambassadorsOpen: true,
  participantsOpen: false,
  ambassadorsNote: "",
  participantsNote: "",
};

/** État des ouvertures de candidatures. Lecture publique : sert au menu, aux pages et aux API d'envoi. */
export async function getRegistrationState(): Promise<RegistrationState> {
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: Object.values(REGISTRATION_KEYS) } },
      select: { key: true, value: true },
    });
    const values = new Map(rows.map(row => [row.key, row.value]));
    const flag = (key: string, fallback: boolean) => (values.has(key) ? values.get(key) === "true" : fallback);

    return {
      ambassadorsOpen: flag(REGISTRATION_KEYS.ambassadorsOpen, DEFAULTS.ambassadorsOpen),
      participantsOpen: flag(REGISTRATION_KEYS.participantsOpen, DEFAULTS.participantsOpen),
      ambassadorsNote: values.get(REGISTRATION_KEYS.ambassadorsNote) ?? "",
      participantsNote: values.get(REGISTRATION_KEYS.participantsNote) ?? "",
    };
  } catch {
    // Base momentanément indisponible : on garde les valeurs par défaut plutôt que de faire planter le site.
    return DEFAULTS;
  }
}
