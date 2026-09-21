"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  archiveQuizAction,
  getQuizAction,
  publishQuizAction,
  removeQuestionFromQuizAction,
  reorderQuizQuestionAction,
  unpublishQuizAction,
} from "@/actions/quiz-actions";
import { QuizAddQuestionDialog } from "@/components/admin/QuizAddQuestionDialog";
import { QuizForm } from "@/components/admin/QuizForm";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import charter from "@/settings/charter";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

type Quiz = Awaited<ReturnType<typeof getQuizAction>>;
type EditionOption = { id: string; name: string; year: number };
type CourseOption = { id: string; title: string; editionId: string };
type BankQuestion = {
  id: string;
  text: string;
  points: number;
  category: { id: string; name: string };
};

export function QuizBuilder({
  quiz: initialQuiz,
  editions,
  courses,
  bankQuestions,
}: {
  quiz: Quiz;
  editions: EditionOption[];
  courses: CourseOption[];
  bankQuestions: BankQuestion[];
}) {
  const [quiz, setQuiz] = useState(initialQuiz);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirm();

  const refresh = (successMessage?: string) => {
    startTransition(async () => {
      try {
        setQuiz(await getQuizAction(quiz.id));
        if (successMessage) setMessage(successMessage);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "Impossible de rafraîchir le QCM"
        );
      }
    });
  };

  const totalPoints = quiz.questions.reduce(
    (sum, item) => sum + (item.points ?? item.question.points),
    0
  );

  const availableQuestions = bankQuestions.filter(
    question => !quiz.questions.some(item => item.questionId === question.id)
  );

  const move = (quizQuestionId: string, direction: "up" | "down") => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await reorderQuizQuestionAction(quizQuestionId, direction);
        refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const remove = async (quizQuestionId: string) => {
    const confirmed = await confirm({
      title: "Retirer cette question du QCM ?",
      description: "Elle reste disponible dans la banque de questions.",
      confirmLabel: "Retirer",
      variant: "destructive",
    });
    if (!confirmed) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await removeQuestionFromQuizAction(quizQuestionId);
        refresh("Question retirée");
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const changeStatus = (action: "publish" | "unpublish" | "archive") => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        if (action === "publish") await publishQuizAction(quiz.id);
        if (action === "unpublish") await unpublishQuizAction(quiz.id);
        if (action === "archive") await archiveQuizAction(quiz.id);
        refresh(
          action === "publish"
            ? "QCM publié"
            : action === "unpublish"
              ? "QCM repassé en brouillon"
              : "QCM archivé"
        );
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <Link href="/admin/qcm" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour aux QCM
        </Link>
      </div>

      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[quiz.status] ?? "bg-muted"}`}
            >
              {STATUS_LABEL[quiz.status] ?? quiz.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {quiz.edition.name} ({quiz.edition.year}) — Seuil {quiz.passingScore}% — {quiz.maxAttempts}{" "}
            tentative{quiz.maxAttempts > 1 ? "s" : ""}
            {quiz.durationMinutes ? ` — ${quiz.durationMinutes} min` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} — {totalPoints} point
            {totalPoints !== 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Paramètres
          </Button>
          <Button
            size="icon"
            variant="outline"
            title="Résultats"
            nativeButton={false}
            className="hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
            render={<Link href={`/admin/qcm/${quiz.id}/resultats`} />}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          {quiz.status === "DRAFT" && (
            <Button
              type="button"
              loading={isPending}
              onClick={() => changeStatus("publish")}
              className="text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Publier
            </Button>
          )}
          {quiz.status === "PUBLISHED" && (
            <Button
              type="button"
              variant="outline"
              loading={isPending}
              onClick={() => changeStatus("unpublish")}
              className="rounded-none"
            >
              Repasser en brouillon
            </Button>
          )}
          {quiz.status !== "ARCHIVED" && (
            <Button
              type="button"
              variant="outline"
              loading={isPending}
              onClick={() => changeStatus("archive")}
              className="rounded-none border-red-500 text-red-600 hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
            >
              Archiver
            </Button>
          )}
        </div>
      </header>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold">Questions du QCM</h2>
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter depuis la banque
          </Button>
        </div>
        <div className="divide-y">
          {quiz.questions.map((item, index) => (
            <div key={item.id} className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {item.question.category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.points ?? item.question.points} pt{(item.points ?? item.question.points) > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm font-medium">{item.question.text}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={index === 0 || isPending}
                  onClick={() => move(item.id, "up")}
                  title="Monter"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={index === quiz.questions.length - 1 || isPending}
                  onClick={() => move(item.id, "down")}
                  title="Descendre"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => remove(item.id)}
                  title="Retirer"
                  className="hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {quiz.questions.length === 0 && (
            <p className="px-5 py-12 text-center text-muted-foreground">
              Aucune question pour l&apos;instant — ajoutez-en depuis la banque de questions.
            </p>
          )}
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen} closeOnOutsideClick={false}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paramètres du QCM</DialogTitle>
          </DialogHeader>
          <QuizForm
            quiz={quiz}
            editions={editions}
            courses={courses}
            onSuccess={() => {
              setSettingsOpen(false);
              refresh("Paramètres enregistrés");
            }}
            onCancel={() => setSettingsOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <QuizAddQuestionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        quizId={quiz.id}
        availableQuestions={availableQuestions}
        onAdded={() => {
          setAddOpen(false);
          refresh("Question ajoutée");
        }}
      />
    </section>
  );
}
