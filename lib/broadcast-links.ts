/** Pages vers lesquelles le message peut renvoyer l'ambassadeur. */
export const BROADCAST_LINK_OPTIONS = [
  { value: "", label: "Aucun lien" },
  { value: "/ambassadeur/documents/permission", label: "Demande de permission" },
  { value: "/ambassadeur/documents/mission", label: "Ordre de mission" },
  { value: "/ambassadeur/engagement", label: "Engagement" },
  { value: "/ambassadeur/documents/formation", label: "Attestation de formation" },
  { value: "/ambassadeur/badge", label: "Mon badge" },
  { value: "/ambassadeur/qcm", label: "Mes QCM" },
  { value: "/ambassadeur/paiement", label: "Mon paiement" },
] as const;

/** Étapes du parcours ambassadeur, pour cibler un message (valeur = `AmbassadorStage`). */
export const BROADCAST_STAGE_OPTIONS = [
  { value: "", label: "Toutes les étapes" },
  { value: "PAIEMENT", label: "Paiement" },
  { value: "FORMATION", label: "Formation" },
  { value: "QCM", label: "QCM" },
  { value: "CLASSEMENT", label: "Classement" },
  { value: "SELECTION", label: "Sélection" },
  { value: "REPECHAGE", label: "Repêchage" },
  { value: "DOCUMENTS", label: "Documents" },
  { value: "ENGAGEMENT", label: "Engagement" },
  { value: "BADGE", label: "Badge" },
  { value: "EMBARQUEMENT", label: "Embarquement" },
  { value: "PRESENCE", label: "Présence" },
  { value: "ATTESTATION", label: "Attestation" },
] as const;
