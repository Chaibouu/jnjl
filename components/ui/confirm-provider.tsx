"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import charter from "@/settings/charter";

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** « destructive » pour une suppression / un refus : bouton rouge. */
  variant?: "default" | "destructive";
};

export type PromptOptions = ConfirmOptions & {
  /** Libellé du champ de saisie. */
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  /** Empêche de valider un champ vide (défaut : vrai). */
  required?: boolean;
};

type Request =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

type ConfirmApi = {
  /** Remplace `window.confirm` : résout `true` si l'utilisateur confirme. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Remplace `window.prompt` : résout le texte saisi, ou `null` si annulé. */
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const ConfirmContext = React.createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm doit être utilisé dans un <ConfirmProvider>");
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<Request | null>(null);
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  const confirm = React.useCallback<ConfirmApi["confirm"]>(
    options =>
      new Promise<boolean>(resolve => {
        setRequest({ kind: "confirm", options, resolve });
        setOpen(true);
      }),
    []
  );

  const prompt = React.useCallback<ConfirmApi["prompt"]>(
    options =>
      new Promise<string | null>(resolve => {
        setValue(options.defaultValue ?? "");
        setRequest({ kind: "prompt", options, resolve });
        setOpen(true);
      }),
    []
  );

  const api = React.useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  /** Ferme la boîte et résout la promesse (annulation par défaut). */
  const settle = (confirmed: boolean) => {
    if (request) {
      if (request.kind === "confirm") request.resolve(confirmed);
      else request.resolve(confirmed ? value.trim() : null);
    }
    setOpen(false);
  };

  const options = request?.options;
  const isPrompt = request?.kind === "prompt";
  const promptOptions = isPrompt ? (request.options as PromptOptions) : null;
  const required = promptOptions ? (promptOptions.required ?? true) : false;
  const canConfirm = !isPrompt || !required || value.trim().length > 0;
  const destructive = options?.variant === "destructive";

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={next => {
          // Échap / clic extérieur = annulation.
          if (!next) settle(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              {destructive && (
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                </span>
              )}
              <div className="space-y-1.5">
                <AlertDialogTitle>{options?.title}</AlertDialogTitle>
                {options?.description && (
                  <AlertDialogDescription>{options.description}</AlertDialogDescription>
                )}
              </div>
            </div>
          </AlertDialogHeader>

          {promptOptions && (
            <div className="space-y-1.5">
              {promptOptions.label && (
                <label className="text-sm font-medium">{promptOptions.label}</label>
              )}
              <Textarea
                autoFocus
                value={value}
                onChange={event => setValue(event.target.value)}
                placeholder={promptOptions.placeholder}
                className="min-h-[90px] rounded-md border border-border bg-muted/40"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>{options?.cancelLabel ?? "Annuler"}</AlertDialogCancel>
            <Button
              type="button"
              disabled={!canConfirm}
              variant={destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
              className={destructive ? undefined : "text-white hover:opacity-90"}
              style={destructive ? undefined : { backgroundColor: charter.orange }}
            >
              {options?.confirmLabel ?? "Confirmer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
