import { getAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { personalize, renderCampaignHtml } from "@/lib/email-campaign";
import appConfig from "@/settings";
import { escapeHtml, infoRow, infoTable, multilineHtml, quoteBlock, renderEmail } from "@/lib/email-layout";

const domain = getAppUrl();

/**
 * Envoi via l'API Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Variables : RESEND_API_KEY (clé API), MAIL_FROM (expéditeur sur un domaine vérifié dans Resend,
 * ex. « JNJL <no-reply@jnjl.ne> »), CONTACT_EMAIL (destinataire des messages du formulaire de contact).
 */
const MAIL_FROM = () => process.env.MAIL_FROM?.trim() || `${appConfig.appName} <onboarding@resend.dev>`;
const CONTACT_RECIPIENT = () => process.env.CONTACT_EMAIL?.trim() || process.env.MAIL_AUTH_USER?.trim() || "";


/**
 * Traduit une erreur d'envoi d'email en consigne compréhensible pour un administrateur. En production,
 * Next.js masque le texte des erreurs levées par une action serveur : les actions d'email renvoient donc
 * ce message dans leur résultat au lieu de lever l'erreur.
 */
export function describeMailError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/RESEND_API_KEY/.test(text)) {
    return "Le service d'envoi d'emails n'est pas configuré sur ce serveur : la variable RESEND_API_KEY est absente (Vercel › Settings › Environment Variables).";
  }
  if (/quota_exceeded/i.test(text)) {
    return "Limite d'envoi du service d'e-mails atteinte (quota du plan gratuit) : réessayez après minuit (heure UTC) ou passez à un plan supérieur. En attendant, remettez les accès à la main.";
  }
  if (/\(401\)/.test(text)) return "La clé du service d'emails (RESEND_API_KEY) est invalide ou révoquée.";
  if (/\((403|422)\)/.test(text)) {
    return "Le service d'emails a refusé l'envoi : vérifiez que le domaine d'envoi est « Verified » dans Resend et que MAIL_FROM utilise ce domaine.";
  }
  if (/\(429\)|tentatives/.test(text)) return "Le service d'emails est momentanément saturé ou injoignable. Réessayez dans une minute.";
  return `L'email n'a pas pu être envoyé (${text.slice(0, 120)}).`;
}

/** Version texte brut d'un email HTML (liens conservés), utilisée quand aucun texte n'est fourni. */
function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => `${label.replace(/<[^>]+>/g, "").trim()} (${href})`)
    .replace(/<\/(p|div|tr|h1|h2|h3|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#8199;|&#65279;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Garde une trace de l'envoi (jamais bloquant : un échec d'écriture ne doit pas empêcher l'email de partir). */
async function logEmail(entry: { kind: string; to: string; subject: string; status: string; resendId?: string | null; error?: string | null }) {
  try {
    await db.emailLog.create({
      data: {
        kind: entry.kind,
        toEmail: entry.to.toLowerCase(),
        subject: entry.subject,
        status: entry.status,
        resendId: entry.resendId ?? null,
        error: entry.error ? entry.error.slice(0, 300) : null,
      },
    });
  } catch (error) {
    console.error("Journal des emails : écriture impossible", error);
  }
}

async function sendMail(message: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Nature de l'email (« access », « contact »…) : sert au suivi dans l'administration. */
  kind?: string;
}) {
  const kind = message.kind ?? "other";
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Envoi d'email impossible : RESEND_API_KEY n'est pas configurée");
    }
    console.warn(`[mail] RESEND_API_KEY absente — email non envoyé (« ${message.subject} » → ${message.to})`);
    return;
  }

  const payload = JSON.stringify({
    from: MAIL_FROM(),
    to: [message.to],
    subject: message.subject,
    html: message.html,
    // Version texte brut : les filtres anti-spam se méfient des emails 100 % HTML.
    text: message.text ?? htmlToText(message.html),
    ...(message.replyTo ? { reply_to: message.replyTo } : {}),
  });

  // Une coupure réseau passagère ou une limite de débit (429 / 5xx) ne doit pas faire perdre un email
  // d'accès : on réessaie deux fois avant d'abandonner.
  const delays = [0, 700, 2000];
  let lastError = "";
  for (const [attempt, delay] of delays.entries()) {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: payload,
        cache: "no-store",
      });
      if (response.ok) {
        const body = (await response.json().catch(() => null)) as { id?: string } | null;
        await logEmail({ kind, to: message.to, subject: message.subject, status: "ACCEPTED", resendId: body?.id });
        return;
      }

      const detail = await response.text().catch(() => "");
      lastError = `${response.status} ${detail}`.slice(0, 300);
      console.error(`Resend : envoi refusé (tentative ${attempt + 1}/${delays.length})`, lastError);
      // Erreur définitive (clé invalide, domaine non vérifié, adresse refusée, quota du plan dépassé…) :
      // inutile de réessayer, cela ne ferait que ralentir les envois groupés.
      const quotaExceeded = /quota_exceeded/i.test(detail);
      if (quotaExceeded || (response.status !== 429 && response.status < 500)) {
        await logEmail({ kind, to: message.to, subject: message.subject, status: "FAILED", error: lastError });
        throw new Error(`Envoi d'email refusé (${response.status})${quotaExceeded ? " quota_exceeded" : ""}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Envoi d'email refusé")) throw error;
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Resend : échec réseau (tentative ${attempt + 1}/${delays.length})`, lastError);
    }
  }
  await logEmail({ kind, to: message.to, subject: message.subject, status: "FAILED", error: lastError });
  throw new Error(`Envoi d'email impossible après ${delays.length} tentatives (${lastError})`);
}

/** Email générique d'information (statut de candidature, badge, etc.). */
export const sendNotificationEmail = async (
  to: string,
  title: string,
  message: string,
  link?: string | null
) => {
  const url = link ? `${domain}${link}` : null;
  await sendMail({
    kind: "notification",
    to,
    subject: `${appConfig.appName} — ${title}`,
    html: renderEmail({
      title,
      preheader: message.slice(0, 120),
      body: `<p style="margin:0;">${multilineHtml(message)}</p>`,
      cta: url ? { label: "Ouvrir mon espace", href: url } : undefined,
    }),
  });
};

export const sendTwoFactorTokenEmail = async (email: string, token: string) => {
  await sendMail({
    kind: "two_factor",
    to: email,
    subject: `${appConfig.appName} — Votre code de vérification`,
    html: renderEmail({
      title: "Votre code de vérification",
      preheader: `Votre code de connexion : ${token}`,
      body: `
        <p style="margin:0 0 12px 0;">Voici votre code de vérification à usage unique :</p>
        ${quoteBlock(`<span style="font-family:Consolas,Menlo,monospace;font-size:26px;font-weight:700;letter-spacing:6px;">${escapeHtml(token)}</span>`)}
        <p style="margin:12px 0 0 0;font-size:13px;color:#6b7280;">Ne le communiquez à personne. Si vous n'êtes pas à l'origine de cette demande, changez votre mot de passe.</p>`,
    }),
    text: `Votre code de vérification ${appConfig.appName} : ${token}\n\nNe le communiquez à personne.`,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${domain}/auth/reset-password?token=${encodeURIComponent(token)}`;

  await sendMail({
    kind: "password_reset",
    to: email,
    subject: `${appConfig.appName} — Réinitialisation de votre mot de passe`,
    html: renderEmail({
      title: "Réinitialiser votre mot de passe",
      preheader: "Cliquez pour choisir un nouveau mot de passe.",
      body: `
        <p style="margin:0 0 12px 0;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe ne sera pas modifié.</p>`,
      cta: { label: "Choisir un nouveau mot de passe", href: resetLink },
    }),
  });
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmLink = `${domain}/auth/verify?token=${encodeURIComponent(token)}`;

  await sendMail({
    kind: "verification",
    to: email,
    subject: `${appConfig.appName} — Vérifiez votre compte`,
    html: renderEmail({
      title: "Vérifiez votre compte",
      preheader: "Un clic pour confirmer votre adresse email.",
      body: `
        <p style="margin:0 0 12px 0;">Merci de vous être inscrit(e) sur la plateforme ${escapeHtml(appConfig.appName)}.</p>
        <p style="margin:0;">Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.</p>`,
      cta: { label: "Vérifier mon compte", href: confirmLink },
    }),
  });
};

export const sendLoginNotificationEmail = async (
  email: string,
  info: {
    device: string;
    browser: string;
    os: string;
    ip: string;
    city: string;
    country: string;
    time: string;
  }
) => {
  await sendMail({
    kind: "login_alert",
    to: email,
    subject: `${appConfig.appName} — Nouvelle connexion à votre compte`,
    html: renderEmail({
      title: "Nouvelle connexion à votre compte",
      preheader: "Une connexion depuis un nouvel appareil a été détectée.",
      body: `
        <p style="margin:0 0 10px 0;">Une nouvelle connexion a été détectée sur votre compte depuis un appareil inconnu.</p>
        ${infoTable([
          infoRow("Appareil", escapeHtml(info.device)),
          infoRow("Navigateur", escapeHtml(info.browser)),
          infoRow("Système", escapeHtml(info.os)),
          infoRow("Adresse IP", escapeHtml(info.ip)),
          infoRow("Localisation", escapeHtml(`${info.city}, ${info.country}`)),
          infoRow("Date", escapeHtml(info.time)),
        ])}
        <p style="margin:12px 0 0 0;">Si c'est bien vous, vous pouvez ignorer cet email.</p>
        <p style="margin:8px 0 0 0;"><strong>Si ce n'est pas vous</strong>, changez immédiatement votre mot de passe et activez la double authentification.</p>`,
      cta: { label: "Sécuriser mon compte", href: `${domain}/profile` },
    }),
  });
};

export const sendContactMessageEmail = async (input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) => {
  const to = CONTACT_RECIPIENT();
  if (!to) throw new Error("Aucune adresse de réception configurée pour le formulaire de contact (CONTACT_EMAIL)");

  const receivedAt = new Date().toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Niamey",
  });
  const subject = input.subject?.trim() || "Nouveau message";
  const replySubject = encodeURIComponent(`Re: ${subject}`);

  await sendMail({
    kind: "contact",
    to,
    replyTo: input.email,
    subject: `[Contact ${appConfig.appName}] ${subject}`,
    html: renderEmail({
      title: "Nouveau message de contact",
      preheader: `${input.name} vous a écrit : ${input.message.slice(0, 100)}`,
      body: `
        ${infoTable([
          infoRow("De", escapeHtml(input.name)),
          infoRow("Email", `<a href="mailto:${escapeHtml(input.email)}" style="color:#D6650F;text-decoration:none;">${escapeHtml(input.email)}</a>`),
          ...(input.subject?.trim() ? [infoRow("Sujet", escapeHtml(input.subject.trim()))] : []),
          infoRow("Reçu le", escapeHtml(receivedAt)),
        ])}
        <p style="margin:18px 0 0 0;font-size:13px;color:#6b7280;">Message :</p>
        ${quoteBlock(multilineHtml(input.message))}
        <p style="margin:14px 0 0 0;font-size:13px;color:#6b7280;">Vous pouvez répondre directement à cet email : votre réponse sera envoyée à ${escapeHtml(input.name)}.</p>`,
      cta: { label: `Répondre à ${input.name.split(" ")[0]}`, href: `mailto:${input.email}?subject=${replySubject}` },
    }),
    text: [
      "Nouveau message de contact",
      "",
      `De : ${input.name} <${input.email}>`,
      ...(input.subject?.trim() ? [`Sujet : ${input.subject.trim()}`] : []),
      `Reçu le : ${receivedAt}`,
      "",
      input.message,
      "",
      "Répondez directement à cet email pour écrire à l'expéditeur.",
    ].join("\n"),
  });
};

export const sendChangeEmailVerification = async (
  email: string,
  verificationToken: string
) => {
  const verificationLink = `${domain}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  await sendMail({
    kind: "change_email",
    to: email,
    subject: `${appConfig.appName} — Confirmez votre nouvelle adresse email`,
    html: renderEmail({
      title: "Confirmer votre nouvelle adresse email",
      preheader: "Un clic pour valider le changement d'adresse.",
      body: `
        <p style="margin:0 0 12px 0;">Vous avez demandé à changer l'adresse email de votre compte. Cliquez sur le bouton ci-dessous pour confirmer.</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
      cta: { label: "Confirmer mon adresse", href: verificationLink },
    }),
  });
};

/** Accusé de réception d'une candidature ambassadeur (aucun compte n'existe encore à ce stade). */
export const sendApplicationReceivedEmail = async (email: string, firstName: string) => {
  await sendMail({
    kind: "application_received",
    to: email,
    subject: `${appConfig.appName} — Votre candidature a bien été envoyée`,
    html: renderEmail({
      title: "Candidature bien reçue",
      preheader: "Votre candidature d'ambassadeur sera examinée par l'équipe de la JNJL.",
      body: `
        <p style="margin:0 0 12px 0;">Bonjour ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 12px 0;">Nous avons bien reçu votre candidature pour devenir <strong>Ambassadeur ${escapeHtml(appConfig.appName)}</strong>.</p>
        <p style="margin:0 0 12px 0;">Elle sera examinée par l'équipe de la JNJL. Vous recevrez un nouvel email dès qu'une décision aura été prise.</p>
        <p style="margin:0;">Merci pour votre engagement.</p>`,
    }),
  });
};

/**
 * Candidature acceptée : accès à la plateforme. Pour un compte créé à l'acceptation, l'email donne
 * le mot de passe provisoire à changer ; pour un compte déjà existant, le mot de passe actuel reste valable.
 */
export const sendApplicationAcceptedEmail = async (
  email: string,
  firstName: string,
  options: { temporaryPassword: string | null; existingAccount?: boolean }
) => {
  const loginUrl = `${domain}/auth/login`;
  const access = options.temporaryPassword
    ? `
      ${infoTable([
        infoRow("Identifiant", escapeHtml(email)),
        infoRow("Mot de passe provisoire", `<span style="font-family:Consolas,Menlo,monospace;background:#F9F9FB;padding:2px 8px;border-radius:4px;">${escapeHtml(options.temporaryPassword)}</span>`),
      ])}
      ${options.existingAccount ? `<p style="margin:10px 0 0 0;"><strong>Ce mot de passe provisoire </strong>.</p>` : ""}
      <p style="margin:10px 0 0 0;"><strong>Important :</strong> pour votre sécurité, changez ce mot de passe dès votre première connexion, depuis votre profil (menu « Mon profil »).</p>`
    : `
      <p style="margin:0 0 10px 0;">Vous avez déjà un compte sur la plateforme : connectez-vous avec votre mot de passe habituel (identifiant : <strong>${escapeHtml(email)}</strong>).</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Vous ne vous en souvenez plus ? <a href="${escapeHtml(`${domain}/auth/forgot-password`)}" style="color:#D6650F;">Réinitialisez votre mot de passe ici</a>.</p>`;

  await sendMail({
    kind: "access",
    to: email,
    subject: `${appConfig.appName} — Votre candidature a été acceptée`,
    html: renderEmail({
      title: "Candidature acceptée",
      preheader: "Félicitations ! Voici vos accès à la plateforme JNJL.",
      body: `
        <p style="margin:0 0 12px 0;">Bonjour ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 12px 0;">Félicitations ! Votre candidature d'ambassadeur ${escapeHtml(appConfig.appName)} a été <strong>acceptée</strong>.</p>
        <p style="margin:0 0 6px 0;">Voici vos accès à la plateforme :</p>
        ${access}
        <p style="margin:14px 0 0 0;">Prochaine étape : une fois connecté(e), réglez vos frais d'inscription depuis « Mon paiement ».</p>`,
      cta: { label: "Me connecter", href: loginUrl },
    }),
  });
};

/** Message envoyé en groupe par le Super Admin (candidats, ambassadeurs, utilisateurs…). */
export const sendCampaignEmail = async (input: {
  to: string;
  subject: string;
  bodyHtml: string;
  firstName: string | null;
}) => {
  await sendMail({
    kind: "campaign",
    to: input.to,
    subject: personalize(input.subject, input.firstName, false),
    html: renderCampaignHtml(input.subject, input.bodyHtml, input.firstName),
  });
};
