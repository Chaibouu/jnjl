"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Award, FileQuestion, Pencil, Plus, Trash2, Video } from "lucide-react";
import {
  deleteTrainingCourseAction,
  deleteTrainingModuleAction,
  listTrainingCoursesAction,
  reorderTrainingCourseAction,
  reorderTrainingModuleAction,
} from "@/actions/training-actions";
import { TrainingCourseForm } from "@/components/admin/TrainingCourseForm";
import { TrainingModuleForm } from "@/components/admin/TrainingModuleForm";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import charter from "@/settings/charter";

type EditionOption = { id: string; name: string; year: number };
type CourseItem = Awaited<ReturnType<typeof listTrainingCoursesAction>>[number];
type ModuleItem = CourseItem["modules"][number];

const QUIZ_STATUS_LABEL: Record<string, string> = {
  DRAFT: "brouillon",
  PUBLISHED: "publié",
  ARCHIVED: "archivé",
};

export function TrainingCourseManager({
  courses: initialCourses,
  editions,
}: {
  courses: CourseItem[];
  editions: EditionOption[];
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [courseDialog, setCourseDialog] = useState<{ course?: CourseItem } | null>(null);
  const [moduleDialog, setModuleDialog] = useState<{ module?: ModuleItem; courseId: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirm();

  const courseOptions = courses.map(course => ({
    id: course.id,
    title: course.title,
    editionId: course.editionId,
    editionLabel: `${course.edition.name} (${course.edition.year})`,
  }));

  const refresh = async (successMessage?: string) => {
    setCourses(await listTrainingCoursesAction());
    if (successMessage) setMessage(successMessage);
  };

  const run = (task: () => Promise<void>) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await task();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const removeCourse = async (course: CourseItem) => {
    const confirmed = await confirm({
      title: `Supprimer la formation « ${course.title} » ?`,
      description: `Ses ${course.modules.length} module(s) seront supprimés et les QCM liés deviendront des QCM libres.`,
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!confirmed) return;
    run(async () => {
      await deleteTrainingCourseAction(course.id);
      await refresh("Formation supprimée");
    });
  };

  const removeModule = async (module: ModuleItem) => {
    const confirmed = await confirm({
      title: `Supprimer le module « ${module.title} » ?`,
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!confirmed) return;
    run(async () => {
      await deleteTrainingModuleAction(module.id);
      await refresh("Module supprimé");
    });
  };

  const groups = courses.reduce<Record<string, CourseItem[]>>((acc, course) => {
    (acc[course.editionId] ??= []).push(course);
    return acc;
  }, {});

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Ambassadeurs</p>
          <h1 className="mt-1 text-3xl font-bold">Formations</h1>
          <p className="mt-2 text-muted-foreground">
            Créez des formations (groupes de modules). Chacune peut être suivie d&apos;un QCM et d&apos;une
            attestation ; les QCM peuvent aussi exister sans formation.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCourseDialog({})}
          className="h-10 rounded-none px-4 font-semibold text-white shadow-sm hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle formation
        </Button>
      </header>

      {message && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-green-600 shadow-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      {courses.length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          Aucune formation pour l&apos;instant.
        </div>
      )}

      {Object.entries(groups).map(([editionId, editionCourses]) => (
        <div key={editionId} className="space-y-4">
          <h2 className="text-lg font-semibold">
            {editionCourses[0].edition.name} ({editionCourses[0].edition.year})
          </h2>

          {editionCourses.map((course, courseIndex) => (
            <div key={course.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{course.title}</h3>
                    {course.isRequired && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Obligatoire
                      </span>
                    )}
                    {course.hasCertificate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Award className="h-3 w-3" />
                        Attestation
                      </span>
                    )}
                  </div>
                  {course.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <FileQuestion className="h-3.5 w-3.5" />
                    {course.quizzes.length === 0 ? (
                      <span>Aucun QCM rattaché (à lier depuis la page QCM)</span>
                    ) : (
                      course.quizzes.map(quiz => (
                        <span key={quiz.id} className="rounded bg-muted px-1.5 py-0.5">
                          {quiz.title} · {QUIZ_STATUS_LABEL[quiz.status] ?? quiz.status}
                          {quiz.countsForRanking ? " · classement" : ""}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={courseIndex === 0 || isPending}
                    title="Monter"
                    onClick={() =>
                      run(async () => {
                        await reorderTrainingCourseAction(course.id, "up");
                        await refresh();
                      })
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={courseIndex === editionCourses.length - 1 || isPending}
                    title="Descendre"
                    onClick={() =>
                      run(async () => {
                        await reorderTrainingCourseAction(course.id, "down");
                        await refresh();
                      })
                    }
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title="Modifier la formation"
                    onClick={() => setCourseDialog({ course })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={isPending}
                    title="Supprimer la formation"
                    onClick={() => removeCourse(course)}
                    className="hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="divide-y">
                {course.modules.map((module, index) => (
                  <div key={module.id} className="flex items-start justify-between gap-4 p-4 pl-6">
                    <div className="min-w-0 cursor-pointer" onClick={() => setModuleDialog({ module, courseId: course.id })}>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{module.title}</p>
                        {module.videoUrl && <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {module._count.progress} ambassadeur{module._count.progress !== 1 ? "s ont" : " a"} terminé ce module
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === 0 || isPending}
                        title="Monter"
                        onClick={() =>
                          run(async () => {
                            await reorderTrainingModuleAction(module.id, "up");
                            await refresh();
                          })
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === course.modules.length - 1 || isPending}
                        title="Descendre"
                        onClick={() =>
                          run(async () => {
                            await reorderTrainingModuleAction(module.id, "down");
                            await refresh();
                          })
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={isPending}
                        title="Supprimer le module"
                        onClick={() => removeModule(module)}
                        className="hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {course.modules.length === 0 && (
                  <p className="p-5 pl-6 text-sm text-muted-foreground">Aucun module dans cette formation.</p>
                )}
                <div className="p-4 pl-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModuleDialog({ courseId: course.id })}
                    className="rounded-none"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un module
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      <Dialog open={!!courseDialog} onOpenChange={open => !open && setCourseDialog(null)} closeOnOutsideClick={false}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{courseDialog?.course ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
            <DialogDescription>
              Vous ajouterez ensuite ses modules, puis vous pourrez lui rattacher un QCM depuis la page QCM.
            </DialogDescription>
          </DialogHeader>
          {courseDialog && (
            <TrainingCourseForm
              course={courseDialog.course}
              editions={editions}
              onSuccess={() => {
                const editing = !!courseDialog.course;
                setCourseDialog(null);
                run(() => refresh(editing ? "Formation mise à jour" : "Formation créée"));
              }}
              onCancel={() => setCourseDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!moduleDialog} onOpenChange={open => !open && setModuleDialog(null)} closeOnOutsideClick={false}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-none sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{moduleDialog?.module ? "Modifier le module" : "Ajouter un module"}</DialogTitle>
          </DialogHeader>
          {moduleDialog && (
            <TrainingModuleForm
              module={moduleDialog.module}
              courses={courseOptions}
              defaultCourseId={moduleDialog.courseId}
              onSuccess={() => {
                const editing = !!moduleDialog.module;
                setModuleDialog(null);
                run(() => refresh(editing ? "Module mis à jour" : "Module créé"));
              }}
              onCancel={() => setModuleDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
