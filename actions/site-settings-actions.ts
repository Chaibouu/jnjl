"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/actions/requirePermission";
import { REGISTRATION_KEYS, getRegistrationState, type RegistrationState } from "@/lib/site-settings";

const WHATSAPP_KEY = "site.whatsapp_group_url";

/** Lien WhatsApp accepté : https uniquement, sur un domaine WhatsApp (groupe, canal ou numéro wa.me). */
function normalizeWhatsappUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Lien invalide : collez l'adresse complète, par exemple https://chat.whatsapp.com/XXXXXXXX");
  }
  const host = url.hostname.toLowerCase();
  const allowed = host === "wa.me" || host === "whatsapp.com" || host.endsWith(".whatsapp.com");
  if (url.protocol !== "https:" || !allowed) {
    throw new Error("Le lien doit être une adresse WhatsApp en https (chat.whatsapp.com, wa.me ou whatsapp.com).");
  }
  return url.toString();
}

/** Lien du groupe WhatsApp affiché sur le site public (vide = bouton masqué). Lecture publique. */
export async function getWhatsappGroupUrl(): Promise<string> {
  try {
    const setting = await db.setting.findUnique({ where: { key: WHATSAPP_KEY }, select: { value: true } });
    return setting?.value ?? "";
  } catch {
    // Base momentanément indisponible : le site s'affiche sans le bouton plutôt que de planter.
    return "";
  }
}

export async function getSiteSettingsAction() {
  await requireSuperAdmin();
  return { whatsappGroupUrl: await getWhatsappGroupUrl(), registration: await getRegistrationState() };
}

/** Enregistre (ou, si vide, retire) le lien du groupe WhatsApp du site public. */
export async function setWhatsappGroupUrlAction(input: string) {
  await requireSuperAdmin();
  const value = normalizeWhatsappUrl(input);

  if (!value) {
    await db.setting.deleteMany({ where: { key: WHATSAPP_KEY } });
  } else {
    await db.setting.upsert({
      where: { key: WHATSAPP_KEY },
      create: { key: WHATSAPP_KEY, value, description: "Lien du groupe WhatsApp (bouton flottant du site public)" },
      update: { value },
    });
  }

  revalidatePath("/", "layout");
  return { whatsappGroupUrl: value };
}

/** Ouvre ou ferme les candidatures ambassadeurs et les inscriptions des participants (site public). */
export async function setRegistrationSettingsAction(input: RegistrationState): Promise<RegistrationState> {
  await requireSuperAdmin();

  const note = (value: string) => String(value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
  const entries: [string, string][] = [
    [REGISTRATION_KEYS.ambassadorsOpen, input.ambassadorsOpen ? "true" : "false"],
    [REGISTRATION_KEYS.participantsOpen, input.participantsOpen ? "true" : "false"],
    [REGISTRATION_KEYS.ambassadorsNote, note(input.ambassadorsNote)],
    [REGISTRATION_KEYS.participantsNote, note(input.participantsNote)],
  ];

  for (const [key, value] of entries) {
    // Un message vide supprime la ligne ; un réglage ouvert/fermé est toujours enregistré explicitement.
    if (!value && key.endsWith("_note")) {
      await db.setting.deleteMany({ where: { key } });
    } else {
      await db.setting.upsert({
        where: { key },
        create: { key, value, description: "Ouverture des candidatures du site public" },
        update: { value },
      });
    }
  }

  revalidatePath("/", "layout");
  return getRegistrationState();
}
