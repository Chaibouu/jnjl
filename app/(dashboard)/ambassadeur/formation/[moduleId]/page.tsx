import { notFound, redirect } from "next/navigation";
import { getMyModuleAction } from "@/actions/training-actions";
import { ModuleReader } from "@/components/ambassador/ModuleReader";

export const dynamic = "force-dynamic";

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;

  let data: Awaited<ReturnType<typeof getMyModuleAction>>;
  try {
    data = await getMyModuleAction(moduleId);
  } catch {
    // Pas de candidature ambassadeur sur l'édition de ce module.
    redirect("/ambassadeur/formation");
  }
  if (!data) notFound();

  return (
    <ModuleReader
      // Un nouveau module = un nouvel état (défilement, bouton).
      key={data.module.id}
      module={data.module}
      courseTitle={data.course.title}
      position={data.position}
      total={data.total}
      previous={data.previous}
      next={data.next}
      initiallyCompleted={!!data.completedAt}
    />
  );
}
