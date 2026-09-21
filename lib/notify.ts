import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/mail";

type NotifyParams = {
  /** Compte destinataire (notification in-app) — absent pour un candidat sans compte. */
  userId?: string | null;
  /** Adresse pour l'email — ignorée si `sendEmail` n'est pas demandé. */
  email?: string | null;
  title: string;
  message: string;
  /** Chemin interne (ex. « /ambassadeur/badge »). */
  link?: string;
  sendEmail?: boolean;
};

/**
 * Notifie un utilisateur (in-app, et par email si demandé).
 * Ne lève jamais : une notification manquée ne doit pas faire échouer l'action métier
 * (ex. un service email indisponible ne doit pas empêcher d'accepter une candidature).
 */
export async function notify(params: NotifyParams): Promise<void> {
  if (params.userId) {
    try {
      await db.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          message: params.message,
          link: params.link ?? null,
        },
      });
    } catch (error) {
      console.error("Notification in-app non créée:", error);
    }
  }

  if (params.sendEmail && params.email) {
    try {
      await sendNotificationEmail(params.email, params.title, params.message, params.link);
    } catch (error) {
      console.error("Email de notification non envoyé:", error);
    }
  }
}
