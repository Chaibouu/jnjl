import { getWhatsappGroupUrl } from "@/actions/site-settings-actions";
import { SiteNavbar } from "@/components/site/SiteNavbar";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const whatsappUrl = await getWhatsappGroupUrl();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {whatsappUrl && <WhatsAppButton href={whatsappUrl} />}
    </div>
  );
}
