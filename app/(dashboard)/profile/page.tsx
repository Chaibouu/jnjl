import { getCurrentProfileAction } from "@/actions/profile-actions";
import { ProfilePageView } from "@/components/profile/ProfilePageView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getCurrentProfileAction();
  return <ProfilePageView initialProfile={profile} />;
}
