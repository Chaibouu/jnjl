/**
 * Bouton d'appel à l'action principal du site, selon ce qui est ouvert. Sans accès à la base de données :
 * utilisable aussi bien dans les composants serveur que dans le menu (composant client).
 *
 * Priorité : candidature ambassadeur ouverte → inscription à l'événement ouverte → « Devenir Jeune Leader »
 * (création de compte), qui reste toujours possible.
 */
export type PrimaryCta = {
  kind: "ambassador" | "participant" | "leader";
  label: string;
  href: string;
};

export function getPrimaryCta(state: { ambassadorsOpen: boolean; participantsOpen: boolean }): PrimaryCta {
  if (state.ambassadorsOpen) {
    return { kind: "ambassador", label: "Devenir Ambassadeur", href: "/ambassadeurs/candidature" };
  }
  if (state.participantsOpen) {
    return { kind: "participant", label: "Participer à l'événement", href: "/participer" };
  }
  return { kind: "leader", label: "Devenir Jeune Leader", href: "/auth/signup" };
}
