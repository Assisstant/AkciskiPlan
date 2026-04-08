import { ApiError } from "@/lib/http";

export type AccessMode = "view" | "edit" | "manage";

export type AccessActor = {
  id: string;
  role: "admin" | "editor" | "viewer";
};

export function canAccessStudent(actor: AccessActor, assignedUserIds: string[], mode: AccessMode) {
  if (actor.role === "admin") {
    return true;
  }

  if (!assignedUserIds.includes(actor.id)) {
    return false;
  }

  if (mode === "view") {
    return true;
  }

  return actor.role === "editor";
}

export function assertStudentAccess(actor: AccessActor, assignedUserIds: string[], mode: AccessMode) {
  if (!canAccessStudent(actor, assignedUserIds, mode)) {
    throw new ApiError(403, "Немате пристап до овој ученик.");
  }
}
