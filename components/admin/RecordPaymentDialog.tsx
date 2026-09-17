"use client";

import { useState, useTransition } from "react";
import { Wallet } from "lucide-react";
import { recordManualPaymentAction } from "@/actions/payment-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import charter from "@/settings/charter";

type ApplicantSummary = {
  id: string;
  firstName: string;
  lastName: string;
  region: { name: string };
};

export function RecordPaymentDialog({
  application,
  onRecorded,
}: {
  application: ApplicantSummary;
  onRecorded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("5000");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await recordManualPaymentAction(application.id, {
          amount: Number(amount),
          reference,
        });
        setOpen(false);
        setReference("");
        onRecorded();
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible d’enregistrer le paiement"
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} closeOnOutsideClick={false}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="text-white hover:opacity-90"
            style={{ backgroundColor: charter.green }}
          />
        }
      >
        <Wallet className="mr-1.5 h-4 w-4" />
        Enregistrer le paiement
      </DialogTrigger>
      <DialogContent className="bg-white">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement manuel</DialogTitle>
            <DialogDescription>
              {application.firstName} {application.lastName} —{" "}
              {application.region.name}. À saisir uniquement une fois le
              montant reçu en espèces par le point focal.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <label className="block space-y-2 text-sm font-medium">
            Montant (FCFA)
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={event => setAmount(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Référence (optionnel)
            <Input
              value={reference}
              onChange={event => setReference(event.target.value)}
              placeholder="N° de reçu papier, repère interne..."
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="text-white hover:opacity-90"
              style={{ backgroundColor: charter.green }}
            >
              {isPending ? "Enregistrement..." : "Confirmer le paiement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
