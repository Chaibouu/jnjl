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
