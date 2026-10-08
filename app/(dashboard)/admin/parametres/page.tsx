import { requireSuperAdmin } from "@/actions/requirePermission";
import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listRegionalQuotasAction } from "@/actions/quota-actions";
import { getEditionDocumentSettingsAction } from "@/actions/edition-document-settings-actions";
import { getSiteSettingsAction } from "@/actions/site-settings-actions";
import { ParametresManager } from "@/components/admin/ParametresManager";
import { RegistrationSettings } from "@/components/admin/RegistrationSettings";
import { WhatsAppSettings } from "@/components/admin/WhatsAppSettings";

export default async function ParametresPage() {
  // Même contrôle côté serveur que la navigation : un lien direct ne suffit pas à ouvrir la page.
  await requireSuperAdmin();
  const editions = await listEditionsForSelectAction();
  const initialEdition = editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const [quotas, documentSettings] = initialEdition
    ? await Promise.all([
        listRegionalQuotasAction(initialEdition.id),
        getEditionDocumentSettingsAction(initialEdition.id),
      ])
    : [[], null];

  const siteSettings = await getSiteSettingsAction();

  return (
    <div className="space-y-6">
      <RegistrationSettings initial={siteSettings.registration} />
      <WhatsAppSettings initialUrl={siteSettings.whatsappGroupUrl} />
      <ParametresManager
        editions={editions}
        initialEditionId={initialEdition?.id ?? ""}
        initialQuotas={quotas}
        initialDocumentSettings={documentSettings}
      />
    </div>
  );
}
