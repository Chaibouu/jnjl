import { CheckCircle2, FileQuestion, GraduationCap } from "lucide-react";
import { getMyTrainingStatusAction } from "@/actions/training-actions";
import { TrainingList } from "@/components/ambassador/TrainingList";
import charter from "@/settings/charter";

export default async function MyTrainingPage() {
  const status = await getMyTrainingStatusAction();

  if (!status) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Formation indisponible</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            La formation s&apos;ouvre une fois votre inscription réglée.
          </p>
        </div>
      </section>
    );
  }

  const validated = !!status.inPersonTrainingAt;

  const banner = validated ? (
    <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        <span className="font-semibold">Formation validée.</span> Le staff de votre région a confirmé votre
        présence. Vous pouvez passer le QCM.
      </p>
    </div>
  ) : (
    <div className="flex items-start gap-3 rounded-2xl border bg-card p-5 text-sm shadow-sm">
      <GraduationCap className="mt-0.5 h-5 w-5 shrink-0" style={{ color: charter.orange }} />
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">La formation est obligatoire.</span> Elle est validée
        par le staff de votre région, qui vous marque présent sur la liste de présence une fois la formation
        suivie. Le QCM s&apos;ouvre dès cette validation.
      </p>
    </div>
  );

  if (status.courses.length === 0) {
    return (
      <section className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
            Parcours ambassadeur
          </p>
          <h1 className="mt-1 text-2xl font-bold">Ma formation</h1>
        </div>
        {banner}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-10">
      {banner}
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
