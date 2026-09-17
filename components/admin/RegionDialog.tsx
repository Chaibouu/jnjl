"use client";

import { useEffect, useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { createRegionAction, updateRegionAction } from "@/actions/region-actions";
import charter from "@/settings/charter";

type Region = { id: string; name: string; code: string };

export function RegionDialog({
  open,
  onOpenChange,
  region,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: Region | null;
  onSaved: (region: Region) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(region?.name ?? "");
      setCode(region?.code ?? "");
      setError("");
    }
  }, [open, region]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const input = { name, code };
        const saved = region
          ? await updateRegionAction(region.id, input)
          : await createRegionAction(input);
        onSaved(saved);
        onOpenChange(false);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} closeOnOutsideClick={false}>
      <DialogContent className="rounded-none">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <DialogTitle>
                {region ? "Modifier la région" : "Ajouter une région"}
              </DialogTitle>
            </div>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Field>
            <FieldLabel>Nom</FieldLabel>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Agadez"
              required
              autoFocus
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <Field>
            <FieldLabel>Code</FieldLabel>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="AGD"
              required
              maxLength={10}
              className="h-11 rounded-none border border-border bg-muted/40 px-3.5 font-mono uppercase transition-colors focus-visible:border-ring focus-visible:bg-white"
            />
          </Field>
          <DialogFooter className="rounded-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-red-500 text-red-600 hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              {isPending
                ? "Enregistrement..."
                : region
                  ? "Enregistrer"
                  : "Créer la région"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
