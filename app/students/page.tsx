import { AppShell } from "@/components/app-shell";
import { StudentDirectory } from "@/components/student-directory";
import { listStudentsForActor } from "@/lib/services/students";
import { requirePageUser } from "@/lib/session";

export default async function StudentsPage() {
  const user = await requirePageUser();
  const students = await listStudentsForActor(user);

  return (
    <AppShell user={user}>
      <StudentDirectory currentUser={user} initialStudents={students} />
    </AppShell>
  );
}
