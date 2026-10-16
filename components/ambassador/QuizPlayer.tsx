"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  saveQuizAnswerAction,
  submitQuizAttemptAction,
  type AnswerFeedback,
} from "@/actions/quiz-attempt-actions";
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
  /** Verdict de la réponse déjà validée (question verrouillée), sinon null. */
  feedback: AnswerFeedback | null;
};

/** Temps laissé pour voir le vert / rouge avant de passer à la question suivante. */
const FEEDBACK_DELAY_MS = 2000;

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
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [validating, setValidating] = useState(false);
  const submittedRef = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { confirm } = useConfirm();

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

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

  const goTo = (target: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setIndex(Math.max(0, Math.min(questions.length - 1, target)));
  };

  /** Valide la réponse côté serveur, affiche le verdict puis passe à la question suivante après un court délai. */
  const validate = async (optionIds: string[]) => {
    if (!current || current.feedback || validating || optionIds.length === 0) return;
    const questionIndex = index;
    setValidating(true);
    setError("");
    try {
      const feedback = await saveQuizAnswerAction(initialAttempt.attemptId, current.questionId, optionIds);
      setQuestions(prev =>
        prev.map((question, i) =>
          i === questionIndex ? { ...question, selectedOptionIds: optionIds, feedback } : question
        )
      );
      if (questionIndex < questions.length - 1) {
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advanceTimer.current = setTimeout(() => {
          // Ne saute pas si l'ambassadeur a déjà navigué ailleurs pendant ce délai.
          setIndex(currentIndex => (currentIndex === questionIndex ? questionIndex + 1 : currentIndex));
        }, FEEDBACK_DELAY_MS);
      }
    } catch {
      setError("Impossible d'enregistrer votre réponse — vérifiez votre connexion.");
    } finally {
      setValidating(false);
    }
  };

  const toggleOption = (optionId: string) => {
    if (!current || current.feedback || validating) return;
    if (current.type === "MULTIPLE_CHOICE") {
      setDrafts(prev => {
        const selected = new Set(prev[current.questionId] ?? []);
        if (selected.has(optionId)) selected.delete(optionId);
        else selected.add(optionId);
        return { ...prev, [current.questionId]: [...selected] };
      });
    } else {
      // Choix unique : un clic valide aussitôt.
      validate([optionId]);
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
              const locked = current.feedback !== null;
              const draft = drafts[current.questionId] ?? [];
              const selected = locked ? current.selectedOptionIds.includes(option.id) : draft.includes(option.id);
              const verdict = locked && selected ? current.feedback!.optionResults[option.id] : null;
              const style =
                verdict === true
                  ? { borderColor: "#16a34a", backgroundColor: "#16a34a1a" }
                  : verdict === false
                    ? { borderColor: "#dc2626", backgroundColor: "#dc26261a" }
                    : selected
                      ? { borderColor: charter.orange, backgroundColor: `${charter.orange}0d` }
                      : undefined;
              return (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                    selected ? "border-2" : "border"
                  } ${locked ? "cursor-default" : "cursor-pointer"}`}
                  style={style}
                >
                  <Checkbox
                    checked={selected}
                    disabled={locked}
                    onCheckedChange={() => toggleOption(option.id)}
                  />
                  <span className="flex-1 text-sm">{option.text}</span>
                  {verdict === true && <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />}
                  {verdict === false && <XCircle className="h-5 w-5 shrink-0 text-red-600" />}
                </label>
              );
            })}
          </div>

          {current.feedback ? (
            <p
              className="mt-4 text-sm font-semibold"
              style={{ color: current.feedback.isCorrect ? "#16a34a" : "#dc2626" }}
            >
              {current.feedback.isCorrect ? "Bonne réponse !" : "Mauvaise réponse."}
              {!isLast && <span className="ml-2 font-normal text-muted-foreground">Question suivante…</span>}
            </p>
          ) : current.type === "MULTIPLE_CHOICE" ? (
            <div className="mt-5">
              <p className="mb-2 text-xs text-muted-foreground">Plusieurs réponses possibles.</p>
              <Button
                type="button"
                loading={validating}
                disabled={(drafts[current.questionId] ?? []).length === 0}
                onClick={() => validate(drafts[current.questionId] ?? [])}
                className="rounded-none text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: charter.orange }}
              >
                Valider ma réponse
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <Button
          type="button"
          variant="outline"
          className="rounded-none"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
        >
          Précédente
        </Button>

        <div className="hidden flex-wrap justify-center gap-1.5 sm:flex">
          {questions.map((question, i) => (
            <button
              key={question.quizQuestionId}
              type="button"
              onClick={() => goTo(i)}
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
            onClick={() => goTo(index + 1)}
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
