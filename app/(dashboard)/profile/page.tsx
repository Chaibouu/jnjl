import { getCurrentProfileAction } from "@/actions/profile-actions";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getCurrentProfileAction();
  return (
    <section className="space-y-6">
      <ProfileEditor profile={profile} />
    </section>
  );
}
