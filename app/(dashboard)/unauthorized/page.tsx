import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <section className="mx-auto max-w-lg">
      <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-xl font-bold">Accès non autorisé</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Vous n&apos;avez pas la permission d&apos;accéder à cette page. Si vous pensez que c&apos;est une erreur,
          contactez un administrateur.
        </p>
        <Button nativeButton={false} className="mt-6" render={<Link href="/dashboard" />}>
          Retour à mon espace
        </Button>
      </div>
    </section>
  );
}
