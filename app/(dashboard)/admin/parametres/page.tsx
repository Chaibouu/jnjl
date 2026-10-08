import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { listRegionalQuotasAction } from "@/actions/quota-actions";
import { getEditionDocumentSettingsAction } from "@/actions/edition-document-settings-actions";
import { getSiteSettingsAction } from "@/actions/site-settings-actions";
import { ParametresManager } from "@/components/admin/ParametresManager";
import { WhatsAppSettings } from "@/components/admin/WhatsAppSettings";

export default async function ParametresPage() {
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
