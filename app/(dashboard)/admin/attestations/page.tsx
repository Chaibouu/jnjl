import { listEditionsForSelectAction } from "@/actions/edition-actions";
import {
  listCertifiableCoursesAction,
  listCertificateCandidatesAction,
  listTrainingCertificateCandidatesAction,
} from "@/actions/certificate-actions";
import { CertificatesManager } from "@/components/admin/CertificatesManager";
import { TrainingCertificatesManager } from "@/components/admin/TrainingCertificatesManager";

export default async function CertificatesPage() {
  const editions = await listEditionsForSelectAction();
  const initialEdition =
    editions.find(edition => edition.status === "ACTIVE") ?? editions[0];

  const [candidates, courses] = await Promise.all([
    initialEdition ? listCertificateCandidatesAction(initialEdition.id) : [],
    listCertifiableCoursesAction(),
  ]);
  const initialCourse = courses[0];
  const trainingData = initialCourse
    ? await listTrainingCertificateCandidatesAction(initialCourse.id)
    : null;

  return (
    <div className="space-y-12">
      <CertificatesManager
        editions={editions}
        initialEditionId={initialEdition?.id ?? ""}
        initialCandidates={candidates}
      />
      <TrainingCertificatesManager
        courses={courses}
        initialCourseId={initialCourse?.id ?? ""}
        initialData={trainingData}
      />
    </div>
  );
}
