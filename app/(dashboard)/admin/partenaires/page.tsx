import { listPartnersAction } from "@/actions/partner-actions";
import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { PartnerManager } from "@/components/admin/PartnerManager";

export default async function PartnersPage() {
  const [partners, editions] = await Promise.all([
    listPartnersAction(),
    listEditionsForSelectAction(),
  ]);
  return <PartnerManager partners={partners} editions={editions} />;
}
