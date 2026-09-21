"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Search, Settings } from "lucide-react";
import { QuizCreateDialog } from "@/components/admin/QuizCreateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

type Quiz = {
  id: string;
  title: string;
  status: string;
  passingScore: number;
  countsForRanking: boolean;
  course: { id: string; title: string } | null;
  edition: { id: string; name: string; year: number };
  _count: { questions: number; attempts: number };
};

type EditionOption = { id: string; name: string; year: number };
type CourseOption = { id: string; title: string; editionId: string };

export function QuizManager({
  quizzes,
  editions,
  courses,
}: {
  quizzes: Quiz[];
  editions: EditionOption[];
  courses: CourseOption[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? quizzes.filter(quiz => quiz.title.toLowerCase().includes(query)) : quizzes;
  }, [search, quizzes]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">QCM</p>
          <h1 className="mt-1 text-3xl font-bold">Questionnaires</h1>
          <p className="mt-2 text-muted-foreground">
            Assemblez vos QCM depuis la banque de questions, sans jamais coder une question.
          </p>
        </div>
        <QuizCreateDialog editions={editions} courses={courses} />
      </header>

      {editions.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">
          Créez d&apos;abord une édition avant de créer un QCM.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liste des QCM</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} QCM
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">QCM</th>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4">Questions</th>
                <th className="px-5 py-4">Tentatives</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(quiz => (
                <tr key={quiz.id} className="group transition-colors hover:bg-muted/50">
                  <td className="px-5 py-4">
                    <p className="font-medium">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Seuil : {quiz.passingScore}% ·{" "}
                      {quiz.course ? `Suite de « ${quiz.course.title} »` : "QCM libre"}
                      {quiz.countsForRanking ? " · Classement" : ""}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {quiz.edition.name} ({quiz.edition.year})
                  </td>
                  <td className="px-5 py-4">{quiz._count.questions}</td>
                  <td className="px-5 py-4">{quiz._count.attempts}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[quiz.status] ?? "bg-muted"}`}
                    >
                      {STATUS_LABEL[quiz.status] ?? quiz.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        title="Configurer"
                        nativeButton={false}
                        className="hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                        render={<Link href={`/admin/qcm/${quiz.id}`} />}
                      >
                        <Settings className="h-4 w-4" />
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
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    Aucun QCM trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
