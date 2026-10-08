"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

/** Pages restant accessibles avant paiement (le Dashboard, les notifications et le profil sont hors de /ambassadeur). */
const ALLOWED_PREFIXES = ["/ambassadeur/paiement"];

export function AmbassadorPaymentGate({
  locked,
  children,
}: {
  locked: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const allowed = ALLOWED_PREFIXES.some(prefix => pathname.startsWith(prefix));

  if (!locked || allowed) return <>{children}</>;

  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-card p-10 text-center shadow-sm">
      <span
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${charter.orange}15` }}
      >
        <Lock className="h-6 w-6" style={{ color: charter.orange }} />
      </span>
      <h1 className="mt-4 text-xl font-bold">Disponible après paiement</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Cette étape sera disponible après le paiement de vos frais d&apos;inscription. Réglez-les
        depuis « Mon paiement » pour poursuivre votre parcours.
      </p>
      <Button
        nativeButton={false}
        className="mt-6 gap-2 rounded-none text-white"
        style={{ backgroundColor: charter.orange }}
        render={<Link href="/ambassadeur/paiement" />}
      >
        <CreditCard className="h-4 w-4" />
        Aller au paiement
      </Button>
    </section>
  );
}
