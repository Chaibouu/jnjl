"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock } from "lucide-react";
import { saveQuizAnswerAction, submitQuizAttemptAction } from "@/actions/quiz-attempt-actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Checkbox } from "@/components/ui/checkbox";
import charter from "@/settings/charter";

type Question = {
  quizQuestionId: string;
  questionId: string;
  type: string;
  text: string;
  points: number;
  options: { id: string; text: string }[];
  selectedOptionIds: string[];
};

type Attempt = {
  attemptId: string;
  status: string;
  startedAt: string | Date;
  deadlineAt: string | Date | null;
  quiz: { id: string; title: string; description: string | null };
  questions: Question[];
};

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function QuizPlayer({ initialAttempt }: { initialAttempt: Attempt }) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialAttempt.questions);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittedRef = useRef(false);
  const { confirm } = useConfirm();

  const deadline = initialAttempt.deadlineAt ? new Date(initialAttempt.deadlineAt) : null;
  const [remainingMs, setRemainingMs] = useState(
    deadline ? deadline.getTime() - Date.now() : null
  );

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await submitQuizAttemptAction(initialAttempt.attemptId);
      router.push(`/ambassadeur/qcm/resultat/${initialAttempt.attemptId}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [initialAttempt.attemptId, router]);

  useEffect(() => {
    if (remainingMs === null) return;
    const interval = setInterval(() => {
      setRemainingMs(current => {
        if (current === null) return current;
        const next = current - 1000;
        if (next <= 0) {
          clearInterval(interval);
          submit();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingMs === null, submit]);

  const current = questions[index];
  const answeredCount = questions.filter(question => question.selectedOptionIds.length > 0).length;

  const setSelection = (optionIds: string[]) => {
    setQuestions(prev =>
      prev.map((question, i) => (i === index ? { ...question, selectedOptionIds: optionIds } : question))
    );
    saveQuizAnswerAction(initialAttempt.attemptId, current.questionId, optionIds).catch(() => {
      setError("Impossible d'enregistrer votre réponse — vérifiez votre connexion.");
    });
  };

  const toggleOption = (optionId: string) => {
    if (current.type === "MULTIPLE_CHOICE") {
      const selected = new Set(current.selectedOptionIds);
      if (selected.has(optionId)) selected.delete(optionId);
      else selected.add(optionId);
      setSelection([...selected]);
    } else {
      setSelection([optionId]);
    }
  };

  const isLast = index === questions.length - 1;

  const timerTone = useMemo(() => {
    if (remainingMs === null) return charter.ink;
    return remainingMs < 60_000 ? "#dc2626" : charter.ink;
  }, [remainingMs]);

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <div>
          <h1 className="text-lg font-bold">{initialAttempt.quiz.title}</h1>
          <p className="text-sm text-muted-foreground">
            Question {index + 1} / {questions.length} — {answeredCount} répondue
            {answeredCount !== 1 ? "s" : ""}
          </p>
        </div>
        {remainingMs !== null && (
          <div className="flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-sm font-bold" style={{ color: timerTone }}>
            <Clock className="h-4 w-4" />
            {formatTime(remainingMs)}
          </div>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${((index + 1) / questions.length) * 100}%`,
            backgroundColor: charter.orange,
          }}
        />
      </div>

      {current && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {current.points} point{current.points > 1 ? "s" : ""}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-relaxed">{current.text}</h2>

          <div className="mt-5 space-y-2.5">
            {current.options.map(option => {
              const selected = current.selectedOptionIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                    selected ? "border-2" : "border"
                  }`}
                  style={selected ? { borderColor: charter.orange, backgroundColor: `${charter.orange}0d` } : undefined}
                >
                  <Checkbox checked={selected} onCheckedChange={() => toggleOption(option.id)} />
                  <span className="text-sm">{option.text}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <Button
          type="button"
          variant="outline"
          className="rounded-none"
          disabled={index === 0}
          onClick={() => setIndex(current => Math.max(0, current - 1))}
        >
          Précédente
        </Button>

        <div className="hidden flex-wrap justify-center gap-1.5 sm:flex">
          {questions.map((question, i) => (
            <button
              key={question.quizQuestionId}
              type="button"
              onClick={() => setIndex(i)}
              className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors"
              style={
                i === index
                  ? { backgroundColor: charter.orange, color: "#fff", borderColor: charter.orange }
                  : question.selectedOptionIds.length > 0
                    ? { borderColor: charter.orange, color: charter.orange }
                    : undefined
              }
            >
              {i + 1}
            </button>
          ))}
        </div>

        {isLast ? (
          <Button
            type="button"
            loading={submitting}
            onClick={async () => {
              const confirmed = await confirm({
                title: "Terminer et soumettre le QCM ?",
                description: "Vous ne pourrez plus modifier vos réponses après l'envoi.",
                confirmLabel: "Soumettre",
              });
              if (confirmed) submit();
            }}
            className="rounded-none text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
          >
            {submitting ? "Envoi..." : "Terminer le QCM"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setIndex(current => Math.min(questions.length - 1, current + 1))}
            className="rounded-none text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: charter.orange }}
          >
            Suivante
          </Button>
        )}
      </div>
    </section>
  );
}
