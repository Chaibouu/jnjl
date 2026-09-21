import { listTrainingCoursesAction } from "@/actions/training-actions";
import { listEditionsForSelectAction } from "@/actions/edition-actions";
import { TrainingCourseManager } from "@/components/admin/TrainingCourseManager";

export default async function TrainingCoursesPage() {
  const [courses, editions] = await Promise.all([
    listTrainingCoursesAction(),
    listEditionsForSelectAction(),
  ]);
  return <TrainingCourseManager courses={courses} editions={editions} />;
}
