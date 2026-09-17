import Image from "next/image";
import Link from "next/link";
import appConfig from "@/settings";
import charter from "@/settings/charter";

export function SiteFooter() {
  return (
    <footer style={{ backgroundColor: charter.ink }}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Image src={appConfig.logoUrl} alt={appConfig.appName} width={32} height={32} className="h-8 w-auto rounded-lg" />
              <span className="text-base font-bold text-white">{appConfig.appName}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-white/60">{appConfig.websiteDescription}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Navigation</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/actualites" className="text-white/70 transition-colors hover:text-white">Actualités</Link></li>
              <li><Link href="/programme" className="text-white/70 transition-colors hover:text-white">Programme</Link></li>
              <li><Link href="/intervenants" className="text-white/70 transition-colors hover:text-white">Intervenants</Link></li>
              <li><Link href="/partenaires" className="text-white/70 transition-colors hover:text-white">Partenaires</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Participer</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/ambassadeurs/candidature" className="text-white/70 transition-colors hover:text-white">Candidature Ambassadeur</Link></li>
              <li><Link href="/auth/login" className="text-white/70 transition-colors hover:text-white">Espace connexion</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} {appConfig.appName}. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
