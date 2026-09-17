"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/actions/requirePermission";
import { sendContactMessageEmail } from "@/lib/mail";
import {
  contactMessageSchema,
  type ContactMessageInput,
} from "@/schemas/contact";

export async function submitContactMessageAction(input: ContactMessageInput) {
  const data = contactMessageSchema.parse(input);

  // Honeypot : un bot remplit ce champ invisible, un humain jamais.
  if (data.website) {
    return { success: true };
  }

  const subject = data.subject?.trim() || undefined;

  await db.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      subject,
      message: data.message,
    },
  });

  try {
    await sendContactMessageEmail({
      name: data.name,
      email: data.email,
      subject,
      message: data.message,
    });
  } catch (error) {
    // Le message reste enregistré même si l'envoi de la notification échoue.
    console.error("Impossible d'envoyer la notification de contact:", error);
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
