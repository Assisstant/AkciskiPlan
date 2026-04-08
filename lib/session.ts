import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/http";

export type SessionUser = {
  id: string;
  name?: string | null;
  username: string;
  role: "admin" | "editor" | "viewer";
};

export async function requirePageUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return session.user as SessionUser;
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user ? (session.user as SessionUser) : null;
}

export async function requireApiUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ApiError(401, "Неовластен пристап.");
  }

  return session.user as SessionUser;
}

export function requireRole(user: SessionUser, roles: SessionUser["role"][]) {
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "Немате дозвола за оваа акција.");
  }
}
