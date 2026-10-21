/**
 * Activation du compte d'un candidat accepté.
 *
 * Un candidat peut s'être inscrit avant d'être accepté : son compte est alors créé « inactif et non vérifié »
 * (en attente de la vérification de son e-mail). À l'acceptation il reçoit ses accès par e-mail avec un mot de
 * passe provisoire : le compte doit donc être activé, sinon la connexion lui réclame une vérification d'e-mail
 * qu'il n'attend pas (et chaque tentative envoie un nouvel e-mail de vérification, ce qui consomme le quota).
 *
 * Un compte désactivé volontairement par un administrateur (`deactivatedAt` renseigné) n'est jamais réactivé ici.
 */
export function acceptedAccountActivation(user: {
  isActive: boolean;
  deactivatedAt: Date | null;
  emailVerified: Date | null;
}): { isActive: true; emailVerified: Date } | Record<string, never> {
  if (user.deactivatedAt) return {};
  if (user.isActive && user.emailVerified) return {};
  return { isActive: true, emailVerified: user.emailVerified ?? new Date() };
}
