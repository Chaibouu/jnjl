import { escapeHtml, publicBaseUrl, renderEmail } from "@/lib/email-layout";
import { sanitizeRichHtml, toPlainText } from "@/lib/rich-content";

/**
 * Mise en forme d'un message envoyé en groupe : le texte rédigé dans l'éditeur est nettoyé puis placé dans le
 * gabarit aux couleurs de la JNJL. `{{prenom}}` est remplacé par le prénom de chaque destinataire.
 */

const FOOTER_NOTE = "Vous recevez ce message car vous avez un compte ou une candidature sur la plateforme JNJL.";

/** Remplace `{{prenom}}` ; sans prénom connu, le mot disparaît avec l'espace qui le précède (« Bonjour, »). */
export function personalize(template: string, firstName: string | null, asHtml: boolean): string {
  const name = firstName?.trim();
  const value = name ? ` ${asHtml ? escapeHtml(name) : name}` : "";
  return template.replace(/\s*\{\{\s*prenom\s*\}\}/gi, value);
}

/** Les liens et images relatifs de l'éditeur (« /uploads/… ») doivent être absolus pour s'afficher dans une boîte mail. */
function absolutize(html: string): string {
  const base = publicBaseUrl();
  return html.replace(/(src|href)="\/(?!\/)/g, `$1="${base}/`);
}

export function cleanCampaignBody(bodyHtml: string): string {
  return sanitizeRichHtml(bodyHtml).trim();
}

/** Vrai si le message contient du texte ou au moins une image. */
export function hasCampaignContent(bodyHtml: string): boolean {
  return toPlainText(bodyHtml).length >= 10 || /<img\b/i.test(bodyHtml);
}

export function renderCampaignHtml(subject: string, bodyHtml: string, firstName: string | null): string {
  const title = personalize(subject, firstName, false);
  const body = absolutize(personalize(cleanCampaignBody(bodyHtml), firstName, true));
  return renderEmail({
    title,
    preheader: toPlainText(body).slice(0, 110),
    body: `<div style="font-size:15px;line-height:1.65;color:#282828;">${body}</div>`,
    footerNote: FOOTER_NOTE,
  });
}
