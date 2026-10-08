import Image from "next/image";
import Link from "next/link";
import appConfig from "@/settings";
import charter from "@/settings/charter";

export function SiteFooter() {
  return (
    <footer style={{ backgroundColor: charter.ink }}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div>
          <div>
            <div className="flex items-center gap-2.5">
              <Image src={appConfig.logoUrl} alt={appConfig.appName} width={32} height={32} className="h-8 w-auto rounded-lg" />
              <span className="text-base font-bold text-white">{appConfig.appName}</span>
            </div>
            <p className="mt-2 max-w-xs text-sm text-white/60">{appConfig.websiteDescription}</p>
          </div>
        </div>
        <p className="mt-5 border-t border-white/10 pt-4 text-center text-xs text-white/40">
          © {new Date().getFullYear()} {appConfig.appName}. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
