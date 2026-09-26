import { z } from "zod";

/**
 * Réglages liés à la génération des documents administratifs (demande de permission,
 * ordre de mission) — édités depuis /admin/parametres, séparément de la fiche édition.
 */
export const editionDocumentSettingsSchema = z.object({
  // Chaînes ISO (yyyy-mm-dd) issues d'un <input type="date"> — converties en Date dans l'action.
  missionDepartureDate: z.string().trim().optional().or(z.literal("")),
  missionReturnDate: z.string().trim().optional().or(z.literal("")),
  absenceStartDate: z.string().trim().optional().or(z.literal("")),
  absenceEndDate: z.string().trim().optional().or(z.literal("")),
  // Utilisé dans la demande de permission — laisser vide pour le texte par défaut.
  patronageText: z.string().trim().max(500).optional().or(z.literal("")),
  // Attestation de participation — chacun a son propre repli (theme/location/dates/nom de l'édition).
  attestationTheme: z.string().trim().max(200).optional().or(z.literal("")),
  attestationLocation: z.string().trim().max(200).optional().or(z.literal("")),
  attestationStartDate: z.string().trim().optional().or(z.literal("")),
  attestationEndDate: z.string().trim().optional().or(z.literal("")),
  attestationEditionLabel: z.string().trim().max(200).optional().or(z.literal("")),
});

export type EditionDocumentSettingsInput = z.infer<typeof editionDocumentSettingsSchema>;
