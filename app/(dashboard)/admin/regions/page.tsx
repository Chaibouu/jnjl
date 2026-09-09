import { listRegionsAction } from "@/actions/region-actions";
import { RegionManager } from "@/components/admin/RegionManager";

export default async function RegionsPage() {
  const regions = await listRegionsAction();
  return <RegionManager initialRegions={regions} />;
}
