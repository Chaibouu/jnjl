"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPaymentDialog } from "@/components/admin/RecordPaymentDialog";

type PaymentItem = {
  id: string;
  firstName: string;
  lastName: string;
  region: { name: string; code: string };
  edition: { name: string; year: number };
  payment: {
    id: string;
    amount: number;
    reference: string | null;
    validatedAt: Date | null;
    validatedBy: { name: string | null } | null;
  } | null;
};

export function PaymentsManager({
  applications,
}: {
  applications: PaymentItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? applications.filter(item =>
          `${item.firstName} ${item.lastName} ${item.region.name}`
            .toLowerCase()
            .includes(query)
        )
      : applications;
  }, [applications, search]);

  const pendingCount = applications.filter(item => !item.payment).length;

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Ambassadeurs
        </p>
        <h1 className="mt-1 text-3xl font-bold">Paiements</h1>
        <p className="mt-2 text-muted-foreground">
          Candidats acceptés en attente ou déjà à jour de leurs frais
          d’inscription (5 000 FCFA), saisis par le point focal régional.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Candidats acceptés</h2>
            <p className="text-sm text-muted-foreground">
              {applications.length} candidat{applications.length !== 1 ? "s" : ""}
              {pendingCount > 0
                ? ` — ${pendingCount} paiement${pendingCount !== 1 ? "s" : ""} en attente`
                : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Candidat</th>
                <th className="px-5 py-4">Région</th>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4">Paiement</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(application => (
                <tr key={application.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {application.firstName} {application.lastName}
                    </p>
                  </td>
                  <td className="px-5 py-4">{application.region.name}</td>
                  <td className="px-5 py-4">
                    {application.edition.name} ({application.edition.year})
                  </td>
                  <td className="px-5 py-4">
                    {application.payment ? (
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          Payé — {application.payment.amount.toLocaleString("fr-FR")} FCFA
                        </span>
                        {application.payment.validatedBy?.name && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            par {application.payment.validatedBy.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        En attente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {application.payment ? (
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={
                            <Link
                              href={`/admin/paiements/${application.id}/recu`}
                            />
                          }
                        >
                          <Receipt className="mr-1.5 h-4 w-4" />
                          Reçu
                        </Button>
                      ) : (
                        <RecordPaymentDialog
                          application={application}
                          onRecorded={() => router.refresh()}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Aucun candidat accepté pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
