import sanitizeHtml from "sanitize-html";

/**
 * Nettoie le HTML produit par l'éditeur riche avant de l'enregistrer ou de l'afficher :
 * seules les balises et propriétés utiles à la mise en forme sont conservées
 * (pas de script, pas de gestionnaires d'événements, liens et images en http(s) uniquement).
 */
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "span", "div",
      "h1", "h2", "h3", "h4",
      "strong", "b", "em", "i", "u", "s", "code", "pre", "mark", "sub", "sup",
      "blockquote",
      "ul", "ol", "li", "label", "input",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col",
      "iframe",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["style", "data-type", "data-checked", "data-color", "colspan", "rowspan", "colwidth"],
      input: ["type", "checked", "disabled"],
      iframe: ["src", "width", "height", "allowfullscreen", "frameborder", "title"],
      col: ["span", "style"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^hsla?\([\d\s,.%]+\)$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^hsla?\([\d\s,.%]+\)$/i],
        "text-align": [/^(left|right|center|justify)$/],
        width: [/^\d+(\.\d+)?(px|%)$/],
        "min-width": [/^\d+(\.\d+)?px$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
    // Les images téléversées sont servies depuis le site (« /uploads/... »).
    allowedSchemesAppliedToAttributes: ["href", "src"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          // Les liens externes s'ouvrent dans un nouvel onglet sans donner accès à la page d'origine.
          ...(attribs.href && /^https?:/i.test(attribs.href)
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
      }),
      input: (tagName, attribs) => ({
        tagName,
        attribs: { type: "checkbox", disabled: "disabled", ...(attribs.checked !== undefined ? { checked: "checked" } : {}) },
      }),
    },
  });
}

const HTML_TAG = /<\/?[a-z][\s\S]*>/i;

/**
 * Contenu prêt à afficher : les anciens contenus (texte simple saisis avant l'éditeur riche)
 * sont convertis en paragraphes ; le HTML est nettoyé dans tous les cas.
 */
export function toDisplayHtml(content: string | null | undefined): string {
  if (!content || !content.trim()) return "";
  if (HTML_TAG.test(content)) return sanitizeRichHtml(content);

  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/** Texte brut d'un contenu (pour un aperçu court ou savoir s'il est vide). */
export function toPlainText(content: string | null | undefined): string {
  if (!content) return "";
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
