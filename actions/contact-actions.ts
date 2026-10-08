"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { sendContactMessageEmail } from "@/lib/mail";
import { rateLimitRedis } from "@/lib/rateLimit-redis";
import {
  contactMessageSchema,
  type ContactMessageInput,
} from "@/schemas/contact";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MIN_FILL_TIME_MS = 3000;
const MAX_LINKS = 2;
const MAX_PER_EMAIL_PER_DAY = 3;
/** Au-delà, les messages sont toujours enregistrés mais n'envoient plus d'email (boîte protégée en cas d'attaque). */
const MAX_NOTIFICATION_EMAILS_PER_HOUR = 20;

async function getRequestIp() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? "";
  return forwarded.split(",")[0].trim() || "unknown";
}

export async function submitContactMessageAction(input: ContactMessageInput) {
  const data = contactMessageSchema.parse(input);

  // Robots : champ piège rempli, ou formulaire envoyé trop vite pour un humain. On répond « succès »
  // sans rien enregistrer ni envoyer, pour ne donner aucune indication au robot.
  if (data.website || (data.elapsedMs ?? 0) < MIN_FILL_TIME_MS) {
    return { success: true };
  }

  // Trop de liens = presque toujours de la publicité ou de l'hameçonnage.
  const linkCount = (data.message.match(/https?:\/\/|www\./gi) ?? []).length;
  if (linkCount > MAX_LINKS) {
    throw new Error("Votre message contient trop de liens. Merci de les retirer et de réessayer.");
  }

  // Limite par adresse IP (Redis, partagée entre instances) : 3 messages par heure.
  const ip = await getRequestIp();
  const limited = await rateLimitRedis(`contact:${ip}`, { windowMs: HOUR, max: 3 });
  if (limited) {
    throw new Error("Vous avez envoyé trop de messages. Merci de réessayer dans une heure.");
  }

  const email = data.email.toLowerCase();
  const subject = data.subject?.replace(/[\r\n]+/g, " ").trim() || undefined;

  // Limite par adresse email (en base : fonctionne même si Redis est indisponible).
  const sinceDay = new Date(Date.now() - DAY);
  const [sameEmailToday, duplicate] = await Promise.all([
    db.contactMessage.count({ where: { email, createdAt: { gte: sinceDay } } }),
    db.contactMessage.findFirst({ where: { email, message: data.message, createdAt: { gte: sinceDay } }, select: { id: true } }),
  ]);
  // Même message déjà reçu : on ne le duplique pas (un double clic ne doit pas envoyer deux emails).
  if (duplicate) return { success: true };
  if (sameEmailToday >= MAX_PER_EMAIL_PER_DAY) {
    throw new Error("Vous avez déjà envoyé plusieurs messages aujourd'hui. Nous vous répondrons très vite.");
  }

  await db.contactMessage.create({
    data: { name: data.name, email, subject, message: data.message },
  });

  const emailsLastHour = await db.contactMessage.count({ where: { createdAt: { gte: new Date(Date.now() - HOUR) } } });
  if (emailsLastHour <= MAX_NOTIFICATION_EMAILS_PER_HOUR) {
    try {
      await sendContactMessageEmail({ name: data.name, email, subject, message: data.message });
    } catch (error) {
      // Le message reste enregistré même si l'envoi de la notification échoue.
      console.error("Impossible d'envoyer la notification de contact:", error);
    }
  }

  return { success: true };
}

export async function listContactMessagesAction() {
  await requirePermission("contact.manage");
  return db.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
}

export async function markContactMessageReadAction(id: string) {
  await requirePermission("contact.manage");
  await db.contactMessage.update({ where: { id }, data: { isRead: true } });
  return { id };
}

export async function deleteContactMessageAction(id: string) {
  await requirePermission("contact.manage");
  await db.contactMessage.delete({ where: { id } });
  return { id };
}
