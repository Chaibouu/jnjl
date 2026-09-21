import { FileQuestion } from "lucide-react";
import { getMyTrainingStatusAction } from "@/actions/training-actions";
import { TrainingList } from "@/components/ambassador/TrainingList";
import charter from "@/settings/charter";

export default async function MyTrainingPage() {
  const status = await getMyTrainingStatusAction();

  if (!status || status.courses.length === 0) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Aucune formation</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucune formation n&apos;est actuellement disponible pour votre candidature.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Parcours ambassadeur
        </p>
        <h1 className="mt-1 text-2xl font-bold">Mes formations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ouvrez chaque module, lisez-le jusqu&apos;à la fin puis marquez-le comme terminé. Les formations obligatoires débloquent le QCM de classement ;
          d&apos;autres sont suivies de leur propre QCM et d&apos;une attestation.
        </p>
      </div>

      {status.courses.map(course => (
        <TrainingList
          key={course.id}
          title={course.title}
          description={course.description}
          isRequired={course.isRequired}
          hasCertificate={course.hasCertificate}
          quizzes={course.quizzes}
          certificate={
            course.certificate
              ? {
                  fileUrl: course.certificate.fileUrl,
                  generatedAt: course.certificate.generatedAt.toISOString(),
                }
              : null
          }
          items={course.items.map(item => ({
            ...item,
            startedAt: item.startedAt ? item.startedAt.toISOString() : null,
            completedAt: item.completedAt ? item.completedAt.toISOString() : null,
          }))}
        />
      ))}
    </section>
  );
}
