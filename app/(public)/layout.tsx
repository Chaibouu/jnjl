import { SiteNavbar } from "@/components/site/SiteNavbar";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
