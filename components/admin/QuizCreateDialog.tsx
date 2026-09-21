"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { QuizForm } from "@/components/admin/QuizForm";
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

type EditionOption = { id: string; name: string; year: number };

type CourseOption = { id: string; title: string; editionId: string };

export function QuizCreateDialog({
  editions,
  courses,
}: {
  editions: EditionOption[];
  courses: CourseOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen} closeOnOutsideClick={false}>
      <DialogTrigger
        render={
          <Button
            className="h-10 rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
            disabled={editions.length === 0}
          />
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Créer un QCM
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto rounded-none bg-white p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <DialogTitle className="text-xl">Créer un QCM</DialogTitle>
          <DialogDescription>
            Le QCM démarre en brouillon. Vous ajouterez les questions à l&apos;étape suivante.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <QuizForm
            editions={editions}
            courses={courses}
            onSuccess={quizId => {
              setOpen(false);
              router.push(`/admin/qcm/${quizId}`);
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
