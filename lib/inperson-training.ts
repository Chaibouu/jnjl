import { db } from "@/lib/db";

/** Réglage (table `settings`) : la formation présentielle a été ouverte par un administrateur. */
export const INPERSON_TRAINING_OPEN_KEY = "training.inperson_open";

/** Fermée par défaut : tant qu'un admin n'a pas autorisé le début, personne ne peut marquer « Formation faite ». */
export async function isInPersonTrainingOpen(): Promise<boolean> {
  const row = await db.setting.findUnique({ where: { key: INPERSON_TRAINING_OPEN_KEY }, select: { value: true } });
  return row?.value === "true";
}
