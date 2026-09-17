import { listSpeakersAction } from "@/actions/speaker-actions";
import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { SpeakerManager } from "@/components/admin/SpeakerManager";

export default async function SpeakersPage() {
  const [speakers, editions] = await Promise.all([
    listSpeakersAction(),
    listEditionsForSelectAction(),
  ]);
  return <SpeakerManager speakers={speakers} editions={editions} />;
}
