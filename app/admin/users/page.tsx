import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { UserManagement } from "@/components/user-management";
import { listUsers } from "@/lib/services/users";
import { requirePageUser } from "@/lib/session";

export default async function UsersPage() {
  const user = await requirePageUser();

  if (user.role !== "admin") {
    redirect("/students");
  }

  const users = await listUsers();

  return (
    <AppShell user={user}>
      <UserManagement currentUser={user} initialUsers={users} />
    </AppShell>
  );
}
