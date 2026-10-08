import { getWhatsappGroupUrl } from "@/actions/site-settings-actions";
import { getRegistrationState } from "@/lib/site-settings";
import { SiteNavbar } from "@/components/site/SiteNavbar";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [whatsappUrl, registration] = await Promise.all([getWhatsappGroupUrl(), getRegistrationState()]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNavbar ambassadorsOpen={registration.ambassadorsOpen} participantsOpen={registration.participantsOpen} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {whatsappUrl && <WhatsAppButton href={whatsappUrl} />}
    </div>
  );
}
