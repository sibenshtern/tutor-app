import { StudentForm } from "@/components/student-form";
import { requirePageSession } from "@/lib/auth-guard";

export default async function NewStudentPage() {
  await requirePageSession();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Новый ученик</h1>
      <StudentForm />
    </div>
  );
}
