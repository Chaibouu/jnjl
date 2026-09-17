"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import appConfig from "@/settings";
import charter from "@/settings/charter";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/actualites", label: "Actualités" },
  { href: "/programme", label: "Programme" },
  { href: "/intervenants", label: "Intervenants" },
  { href: "/partenaires", label: "Partenaires" },
];

export function SiteNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur transition-shadow duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src={appConfig.logoUrl} alt={appConfig.appName} width={36} height={36} className="h-9 w-auto rounded-lg" />
          <span className="hidden text-lg font-bold sm:inline" style={{ color: charter.ink }}>
            {appConfig.appName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium transition-colors"
                style={{ color: isActive ? charter.ink : charter.inkSoft }}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full"
                    style={{ backgroundColor: charter.orange }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            nativeButton={false}
            className="rounded-none text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
            render={<Link href="/ambassadeurs/candidature" />}
          >
            Devenir Ambassadeur
          </Button>
          <Button variant="outline" className="rounded-none" nativeButton={false} render={<Link href="/auth/login" />}>
            Connexion
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-3/4">
          <SheetHeader>
            <SheetTitle>{appConfig.appName}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            {LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                style={pathname === link.href ? { backgroundColor: charter.orange } : undefined}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t pt-4">
              <Button
                nativeButton={false}
                className="rounded-none text-white shadow-sm hover:opacity-90"
                style={{ backgroundColor: charter.orange }}
                render={<Link href="/ambassadeurs/candidature" onClick={() => setMenuOpen(false)} />}
              >
                Devenir Ambassadeur
              </Button>
              <Button
                variant="outline"
                className="rounded-none"
                nativeButton={false}
                render={<Link href="/auth/login" onClick={() => setMenuOpen(false)} />}
              >
                Connexion
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
