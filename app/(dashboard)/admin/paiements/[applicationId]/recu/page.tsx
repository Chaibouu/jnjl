import Link from "next/link";
import { getAmbassadorPaymentReceiptAction } from "@/actions/payment-actions";
import { PrintReceiptButton } from "@/components/admin/PrintReceiptButton";
import charter from "@/settings/charter";

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = await getAmbassadorPaymentReceiptAction(applicationId);
  const payment = application.payment!;
  const receiptNumber = payment.id.slice(-8).toUpperCase();
  const paidAt = payment.validatedAt
    ? new Date(payment.validatedAt).toLocaleString("fr-FR")
    : "-";

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <Link
        href="/admin/paiements"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Retour aux paiements
      </Link>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${charter.orange}, ${charter.gold})`,
          }}
        />
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Reçu de paiement — Frais d’inscription Ambassadeur
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {application.edition.name} ({application.edition.year})
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            N° {receiptNumber}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Detail
              label="Candidat"
              value={`${application.firstName} ${application.lastName}`}
            />
            <Detail label="Région" value={application.region.name} />
            <Detail label="Date" value={paidAt} />
            <Detail
              label="Reçu par"
              value={payment.validatedBy?.name ?? "-"}
            />
            {payment.reference && (
              <Detail label="Référence" value={payment.reference} />
            )}
          </dl>

          <div
            className="mt-6 rounded-xl p-5 text-center"
            style={{ backgroundColor: charter.bg }}
          >
            <p className="text-3xl font-extrabold" style={{ color: charter.green }}>
              {payment.amount.toLocaleString("fr-FR")} FCFA
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Montant reçu en espèces
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <PrintReceiptButton
              receipt={{
                receiptNumber,
                candidateName: `${application.firstName} ${application.lastName}`,
                region: application.region.name,
                edition: `${application.edition.name} (${application.edition.year})`,
                amount: payment.amount,
                reference: payment.reference,
                paidAt,
                validatedBy: payment.validatedBy?.name ?? "-",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
