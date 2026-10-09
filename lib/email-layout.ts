import { getAppUrl } from "@/lib/app-url";
import appConfig from "@/settings";
import charter from "@/settings/charter";

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Texte saisi par un utilisateur, prêt à insérer dans l'email (échappé, sauts de ligne conservés). */
export const multilineHtml = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br />");

type Cta = { label: string; href: string };

/** Domaine public du site : le logo d'un email doit pointer vers une adresse joignable depuis Gmail/Outlook. */
const PUBLIC_SITE_URL = "https://jnjl.ne";

/**
 * Adresse publique utilisée pour le logo et le pied de page. En développement (localhost) ou sans
 * variable configurée, on retombe sur le domaine de production : le logo s'affiche alors partout,
 * y compris dans les emails de test envoyés depuis un poste local.
 */
export function publicBaseUrl(): string {
  const base = getAppUrl();
  return !base || /localhost|127\.0\.0\.1|\.local\b/i.test(base) ? PUBLIC_SITE_URL : base;
}

/**
 * Enveloppe commune des emails de la plateforme, aux couleurs de la JNJL.
 * Mise en page en tableaux et styles en ligne : seule façon d'être rendue de façon fiable par Gmail,
 * Outlook et les applications mobiles (qui ignorent <style>, flexbox et les variables CSS).
 * Le logo est appelé par son adresse publique : il s'affiche une fois le site en ligne.
 */
export function renderEmail(options: {
  /** Titre affiché dans le bandeau et utilisé pour l'aperçu. */
  title: string;
  /** Courte phrase affichée par la boîte de réception à côté de l'objet. */
  preheader?: string;
  /** Corps de l'email (HTML déjà échappé par l'appelant). */
  body: string;
  cta?: Cta;
  /** Phrase discrète sous les coordonnées (ex. « Vous recevez ce message car… »). */
  footerNote?: string;
}): string {
  const base = publicBaseUrl();
  const logo = `${base}${appConfig.logoUrl}`;
  const { title, preheader = "", body, cta, footerNote } = options;

  const button = cta
    ? `<tr><td style="padding:8px 32px 28px 32px;" align="left">
         <a href="${escapeHtml(cta.href)}" style="display:inline-block;background:${charter.orange};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:6px;">${escapeHtml(cta.label)}</a>
       </td></tr>`
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${charter.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&#8199;&#65279;&#8199;&#65279;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${charter.bg};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${charter.border};font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="background:${charter.ink};padding:22px 32px;">
        <table role="presentation" cellspacing="0" cellpadding="0"><tr>
          <td style="padding-right:14px;"><img src="${escapeHtml(logo)}" width="48" height="48" alt="${escapeHtml(appConfig.appName)}" style="display:block;border-radius:10px;background:#ffffff;" /></td>
          <td style="color:#ffffff;font-size:13px;line-height:1.35;letter-spacing:0.3px;">
            <span style="font-size:18px;font-weight:700;">${escapeHtml(appConfig.appName)}</span><br />
            <span style="color:${charter.gold};">Journée Nationale du Jeune Leader</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="height:5px;line-height:5px;font-size:0;background:${charter.orange};">&nbsp;</td></tr>
      <tr><td style="padding:30px 32px 6px 32px;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;color:${charter.ink};">${escapeHtml(title)}</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 22px 32px;color:${charter.ink};font-size:15px;line-height:1.65;">
        ${body}
      </td></tr>
      ${button}
      <tr><td style="background:${charter.bg};padding:18px 32px;border-top:1px solid ${charter.border};color:#6b7280;font-size:12px;line-height:1.6;">
        ${escapeHtml(appConfig.appName)} — Journée Nationale du Jeune Leader, Niamey (Niger)<br />
        <a href="${escapeHtml(base)}" style="color:${charter.orange};text-decoration:none;">${escapeHtml(base.replace(/^https?:\/\//, ""))}</a>
        ${footerNote ? `<br /><span style="color:#9ca3af;">${escapeHtml(footerNote)}</span>` : ""}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Ligne « libellé : valeur » d'un tableau d'informations dans un email. */
export function infoRow(label: string, valueHtml: string): string {
  return `<tr>
    <td style="padding:7px 16px 7px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:7px 0;color:${charter.ink};font-size:14px;font-weight:600;vertical-align:top;">${valueHtml}</td>
  </tr>`;
}

export const infoTable = (rows: string[]) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 8px 0;">${rows.join("")}</table>`;

/** Bloc de citation (message d'un visiteur, mot de passe provisoire…). */
export const quoteBlock = (html: string) =>
  `<div style="margin:12px 0;padding:14px 18px;background:${charter.bg};border-left:4px solid ${charter.orange};border-radius:4px;color:${charter.ink};font-size:15px;line-height:1.65;">${html}</div>`;
