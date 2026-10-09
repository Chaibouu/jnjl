/**
 * Message d'accès à remettre à un ambassadeur accepté (WhatsApp, SMS, appel…), lorsque l'e-mail n'a pas pu
 * lui parvenir. Sans accès à la base : utilisable côté serveur comme côté navigateur.
 */

export type AccessMessageInput = {
  firstName: string;
  email: string;
  password: string;
  loginUrl: string;
  /** Étape du parcours : le rappel du paiement n'a de sens qu'avant qu'il soit fait. */
  stage?: string | null;
};

export function buildAccessMessage({ firstName, email, password, loginUrl, stage }: AccessMessageInput): string {
  const nextStep =
    !stage || stage === "PAIEMENT" || stage === "CANDIDATURE"
      ? "Prochaine étape : réglez vos frais d'inscription depuis « Mon paiement »."
      : "Retrouvez votre parcours depuis votre tableau de bord.";

  return [
    `Bonjour ${firstName},`,
    "",
    "Félicitations ! Votre candidature d'ambassadeur JNJL a été acceptée. Voici vos accès à la plateforme :",
    "",
    `Site : ${loginUrl}`,
    `Identifiant : ${email}`,
    `Mot de passe provisoire : ${password}`,
    "",
    "Changez ce mot de passe dès votre première connexion (menu « Mon profil »).",
    nextStep,
    "",
    "L'équipe JNJL",
  ].join("\n");
}

/** Numéro au format international sans « + » (indicatif du Niger ajouté pour un numéro à 8 chiffres). */
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (digits.length === 8) return `227${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** Lien qui ouvre WhatsApp avec le message prêt à envoyer ; `null` si le numéro est inutilisable. */
export function buildWhatsappLink(phone: string | null | undefined, message: string): string | null {
  const number = toWhatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
