/** Injecte des données structurées schema.org. Un bloc `application/ld+json` n'est pas exécuté : la CSP ne le bloque pas. */
export function JsonLd({ data }: { data: object | object[] }) {
  // « < » échappé pour empêcher toute fermeture prématurée de la balise <script>.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
