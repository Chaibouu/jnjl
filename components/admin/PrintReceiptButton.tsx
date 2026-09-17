"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

type ReceiptData = {
  receiptNumber: string;
  candidateName: string;
  region: string;
  edition: string;
  amount: number;
  reference: string | null;
  paidAt: string;
  validatedBy: string;
};

/**
 * Ouvre une fenêtre dédiée avec uniquement le contenu du reçu (sans le chrome
 * du tableau de bord) et lance l'impression navigateur — évite de devoir
 * modifier le layout partagé juste pour un cas d'usage imprimable.
 */
export function PrintReceiptButton({ receipt }: { receipt: ReceiptData }) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=480,height=700");
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Reçu ${receipt.receiptNumber}</title>
<style>
  body { font-family: system-ui, sans-serif; color: ${charter.ink}; padding: 32px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: ${charter.inkFaint}; font-size: 12px; margin-bottom: 24px; }
  .bar { height: 4px; background: linear-gradient(90deg, ${charter.orange}, ${charter.gold}); border-radius: 4px; margin-bottom: 20px; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; margin: 0; }
  dt { font-size: 11px; text-transform: uppercase; color: ${charter.inkFaint}; }
  dd { margin: 2px 0 0; font-size: 14px; font-weight: 600; }
  .amount { margin-top: 24px; padding: 16px; border-radius: 12px; background: ${charter.bg}; text-align: center; }
  .amount .value { font-size: 28px; font-weight: 800; color: ${charter.green}; }
  .footer { margin-top: 24px; font-size: 11px; color: ${charter.inkFaint}; text-align: center; }
</style>
</head>
<body>
  <div class="bar"></div>
  <h1>Reçu de paiement — Frais d'inscription Ambassadeur</h1>
  <p class="sub">${receipt.edition} · N° ${receipt.receiptNumber}</p>
  <dl>
    <div><dt>Candidat</dt><dd>${receipt.candidateName}</dd></div>
    <div><dt>Région</dt><dd>${receipt.region}</dd></div>
    <div><dt>Date</dt><dd>${receipt.paidAt}</dd></div>
    <div><dt>Reçu par</dt><dd>${receipt.validatedBy}</dd></div>
    ${receipt.reference ? `<div><dt>Référence</dt><dd>${receipt.reference}</dd></div>` : ""}
  </dl>
  <div class="amount">
    <div class="value">${receipt.amount.toLocaleString("fr-FR")} FCFA</div>
    <div class="sub">Montant reçu en espèces</div>
  </div>
  <p class="footer">Journée Nationale du Jeune Leader — document généré par la plateforme</p>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Button onClick={handlePrint} variant="outline">
      <Printer className="mr-1.5 h-4 w-4" />
      Imprimer le reçu
    </Button>
  );
}
