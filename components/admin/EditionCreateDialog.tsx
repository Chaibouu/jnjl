"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EditionForm } from "@/components/admin/EditionForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import charter from "@/settings/charter";

export function EditionCreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen} closeOnOutsideClick={false}>
      <DialogTrigger
        render={
          <Button
            className="h-10 rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
          />
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter une édition
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto rounded-none bg-white p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <DialogTitle className="text-xl">Ajouter une édition</DialogTitle>
          <DialogDescription>
            L’édition sera créée en brouillon. Vous pourrez l’activer ensuite.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <EditionForm
            embedded
            onSuccess={() => {
              setOpen(false);
              onCreated();
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
