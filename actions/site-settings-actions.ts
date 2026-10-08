"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";

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
  await requirePermission("editions.manage");
  return { whatsappGroupUrl: await getWhatsappGroupUrl() };
}

/** Enregistre (ou, si vide, retire) le lien du groupe WhatsApp du site public. */
export async function setWhatsappGroupUrlAction(input: string) {
  await requirePermission("editions.manage");
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
