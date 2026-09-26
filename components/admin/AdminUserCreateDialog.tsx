"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AdminUserForm } from "@/components/admin/AdminUserForm";
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

type PermissionItem = { code: string; label: string; category: string | null };
type RegionItem = { id: string; name: string; code: string };

export function AdminUserCreateDialog({
  permissions,
  regions,
  onCreated,
}: {
  permissions: PermissionItem[];
  regions: RegionItem[];
  onCreated: () => void;
}) {
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
        Ajouter un utilisateur
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto rounded-none bg-white p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <DialogTitle className="text-xl">Ajouter un utilisateur</DialogTitle>
          <DialogDescription>
            Créez un compte et attribuez-lui son niveau d’accès.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <AdminUserForm
            embedded
            permissions={permissions}
            regions={regions}
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
