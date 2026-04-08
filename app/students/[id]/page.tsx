import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StudentWorkspace } from "@/components/student-workspace";
import { getPlanForActor } from "@/lib/services/plans";
import { getStudentForActor } from "@/lib/services/students";
import { listUsers } from "@/lib/services/users";
import { requirePageUser } from "@/lib/session";

export default async function StudentDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const student = await getStudentForActor(user, id);
  const selectedPlanId = searchParams.plan ?? student.plans[0]?.id;

  if (!selectedPlanId && user.role !== "viewer") {
    redirect("/students");
  }

  const plan = selectedPlanId ? await getPlanForActor(user, id, selectedPlanId) : null;
  const users = user.role === "admin" ? await listUsers() : [];

  return (
    <AppShell user={user}>
      <StudentWorkspace currentUser={user} initialStudent={student} initialPlan={plan} availableUsers={users} />
    </AppShell>
  );
}
