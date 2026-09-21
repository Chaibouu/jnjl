"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Ticket,
  UserCheck,
  UserPlus,
  UserRound,
  Handshake,
} from "lucide-react";
import { logout } from "@/actions/logout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSession } from "@/context/SessionContext";
import appConfig from "@/settings";
import charter from "@/settings/charter";

/** Liens toujours visibles dans la barre. */
const MAIN_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/#a-propos", label: "À propos" },
  { href: "/actualites", label: "Actualités" },
  { href: "/#contact", label: "Contact" },
];

/** Le reste du site, regroupé dans le menu déroulant « Découvrir ». */
const MORE_GROUPS = [
  {
    label: "L'événement",
    items: [
      { href: "/programme", label: "Programme", icon: CalendarDays },
      { href: "/intervenants", label: "Intervenants", icon: Mic },
      { href: "/partenaires", label: "Partenaires", icon: Handshake },
    ],
  },
  {
    label: "Participer",
    items: [
      { href: "/participer", label: "Participer à l'événement", icon: Ticket },
      { href: "/ambassadeurs/candidature", label: "Devenir Ambassadeur", icon: UserCheck },
      { href: "/auth/signup", label: "Devenir Jeune Leader", icon: UserPlus },
    ],
  },
  {
    label: "Archives",
    items: [{ href: "/editions", label: "Éditions précédentes", icon: History }],
  },
];

const MORE_PATHS = MORE_GROUPS.flatMap(group => group.items.map(item => item.href));

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function SiteNavbar() {
  const pathname = usePathname();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const moreActive = MORE_PATHS.includes(pathname);
  // Le bouton « Devenir Ambassadeur » n'a pas de sens pour quelqu'un qui l'est déjà.
  const showAmbassadorCta = !user?.hasAmbassadorApplication;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // Rechargement complet : la session côté client repart de zéro.
      window.location.assign("/");
    }
  };

  const linkStyle = (active: boolean) => ({ color: active ? charter.ink : charter.inkSoft });

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur transition-shadow duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src={appConfig.logoUrl} alt={appConfig.appName} width={36} height={36} className="h-9 w-auto" />
          <span className="hidden text-lg font-bold sm:inline" style={{ color: charter.ink }}>
            {appConfig.appName}
          </span>
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {MAIN_LINKS.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium transition-colors hover:text-[#282828]"
                style={linkStyle(isActive)}
              >
                {link.label}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[1px] h-0.5" style={{ backgroundColor: charter.orange }} />
                )}
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger
              className="relative flex items-center gap-1 px-4 py-2 text-sm font-medium outline-none transition-colors hover:text-[#282828] data-popup-open:text-[#282828]"
              style={linkStyle(moreActive)}
            >
              Découvrir
              <ChevronDown className="h-3.5 w-3.5" />
              {moreActive && (
                <span className="absolute inset-x-3 -bottom-[1px] h-0.5" style={{ backgroundColor: charter.orange }} />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-64 rounded-none p-2">
              {MORE_GROUPS.map((group, index) => (
                <div key={group.label}>
                  {index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider">
                      {group.label}
                    </DropdownMenuLabel>
                    {group.items.map(item => (
                      <DropdownMenuItem
                        key={item.href}
                        className="rounded-none px-2 py-2 text-sm"
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="h-4 w-4" style={{ color: charter.orange }} />
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Actions desktop : CTA + connexion / avatar */}
        <div className="hidden items-center gap-3 md:flex">
          {showAmbassadorCta && (
            <Button nativeButton={false} render={<Link href="/ambassadeurs/candidature" />}>
              Devenir Ambassadeur
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Menu du compte"
                className="flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#F07321]/50"
              >
                <Avatar size="lg">
                  <AvatarImage src={user.image || undefined} alt={user.name ?? "Avatar"} />
                  <AvatarFallback className="text-white" style={{ backgroundColor: charter.orange }}>
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-none p-1">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-2">
                    <span className="block truncate text-sm font-semibold text-foreground">{user.name || "Mon compte"}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-none px-2 py-2" render={<Link href="/dashboard" />}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-none px-2 py-2" render={<Link href="/profile" />}>
                  <UserRound className="h-4 w-4" />
                  Mon profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="rounded-none px-2 py-2"
                  disabled={loggingOut}
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Déconnexion…" : "Se déconnecter"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" nativeButton={false} render={<Link href="/auth/login" />}>
              Connexion
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Ouvrir le menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Menu mobile */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-3/4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{appConfig.appName}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4 pb-6">
            {user && (
              <div className="mb-2 flex items-center gap-3 border-b pb-4">
                <Avatar size="lg">
                  <AvatarImage src={user.image || undefined} alt={user.name ?? "Avatar"} />
                  <AvatarFallback className="text-white" style={{ backgroundColor: charter.orange }}>
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name || "Mon compte"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}

            {MAIN_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === link.href ? "text-white" : "text-muted-foreground hover:bg-muted"
                }`}
                style={pathname === link.href ? { backgroundColor: charter.orange } : undefined}
              >
                {link.label}
              </Link>
            ))}

            {MORE_GROUPS.map(group => (
              <div key={group.label} className="mt-3">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                      pathname === item.href ? "text-white" : "text-muted-foreground hover:bg-muted"
                    }`}
                    style={pathname === item.href ? { backgroundColor: charter.orange } : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}

            <div className="mt-4 flex flex-col gap-2 border-t pt-4">
              {showAmbassadorCta && (
                <Button
                  nativeButton={false}
                  render={<Link href="/ambassadeurs/candidature" onClick={() => setMenuOpen(false)} />}
                >
                  Devenir Ambassadeur
                </Button>
              )}
              {user ? (
                <>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/dashboard" onClick={() => setMenuOpen(false)} />}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/profile" onClick={() => setMenuOpen(false)} />}
                  >
                    <UserRound className="mr-2 h-4 w-4" />
                    Mon profil
                  </Button>
                  <Button variant="cancel" loading={loggingOut} onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/auth/login" onClick={() => setMenuOpen(false)} />}
                >
                  Connexion
                </Button>
              )}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
