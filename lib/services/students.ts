import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { buildEmptyActionPlanPayload, payloadFromPrismaJson, StudentSummary } from "@/lib/import-export";
import { ApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { CreateStudentInput, UpdateStudentInput } from "@/lib/schemas/action-plan";
import { SessionUser } from "@/lib/session";
import { assertStudentAccess } from "@/lib/services/permissions";
import { nowIso } from "@/lib/utils";

const studentListInclude = {
  assignments: {
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          role: true
        }
      }
    }
  },
  plans: {
    select: {
      id: true,
      schoolYear: true,
      version: true,
      status: true,
      updatedAt: true
    },
    orderBy: {
      schoolYear: "desc" as const
    }
  },
  lastEditedBy: {
    select: {
      displayName: true
    }
  }
} satisfies Prisma.StudentInclude;

const studentDetailInclude = {
  ...studentListInclude
} satisfies Prisma.StudentInclude;

type StudentWithListRelations = Prisma.StudentGetPayload<{
  include: typeof studentListInclude;
}>;

export type StudentDetail = StudentSummary & {
  createdAt: string;
  updatedAt: string;
};

export function toStudentSummary(student: StudentWithListRelations): StudentSummary {
  return {
    id: student.id,
    fullName: student.fullName,
    grade: student.grade,
    programType: student.programType,
    schoolYear: student.schoolYear,
    status: student.status,
    lastEditedAt: student.lastEditedAt?.toISOString() ?? null,
    lastEditedByName: student.lastEditedBy?.displayName ?? "",
    assignments: student.assignments.map((assignment) => ({
      id: assignment.user.id,
      displayName: assignment.user.displayName,
      username: assignment.user.username,
      role: assignment.user.role
    })),
    plans: student.plans.map((plan) => ({
      id: plan.id,
      schoolYear: plan.schoolYear,
      version: plan.version,
      status: plan.status,
      updatedAt: plan.updatedAt.toISOString()
    }))
  };
}

function toStudentDetail(student: Prisma.StudentGetPayload<{ include: typeof studentDetailInclude }>): StudentDetail {
  return {
    ...toStudentSummary(student),
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString()
  };
}

function assignedWhere(actor: SessionUser): Prisma.StudentWhereInput {
  return actor.role === "admin"
    ? {}
    : {
        assignments: {
          some: {
            userId: actor.id
          }
        }
      };
}

export async function listStudentsForActor(actor: SessionUser) {
  const students = await prisma.student.findMany({
    where: assignedWhere(actor),
    include: studentListInclude,
    orderBy: [
      { status: "asc" },
      { fullName: "asc" }
    ]
  });

  return students.map((student) => toStudentSummary(student));
}

export async function getStudentForActor(actor: SessionUser, studentId: string) {
  const student = await prisma.student.findUnique({
    where: {
      id: studentId
    },
    include: studentDetailInclude
  });

  if (!student) {
    throw new ApiError(404, "Ученикот не е пронајден.");
  }

  assertStudentAccess(
    actor,
    student.assignments.map((assignment) => assignment.userId),
    "view"
  );

  return toStudentDetail(student);
}

export async function createStudent(actor: SessionUser, input: CreateStudentInput) {
  if (actor.role === "viewer") {
    throw new ApiError(403, "Прегледувач не може да креира ученик.");
  }

  const planId = randomUUID();
  const actorSnapshot = {
    id: actor.id,
    username: actor.username,
    displayName: actor.name ?? actor.username
  };
  const assignmentIds = actor.role === "admin" ? Array.from(new Set(input.assignedUserIds)) : [actor.id];
  const timestamp = nowIso();

  const created = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        fullName: input.fullName.trim(),
        grade: input.grade,
        programType: input.programType,
        schoolYear: input.schoolYear,
        status: "active",
        lastEditedAt: new Date(timestamp),
        lastEditedById: actor.id
      },
      include: studentDetailInclude
    });

    if (assignmentIds.length > 0) {
      await tx.studentAssignment.createMany({
        data: assignmentIds.map((userId) => ({
          studentId: student.id,
          userId,
          assignedById: actor.id
        })),
        skipDuplicates: true
      });
    }

    const payload = buildEmptyActionPlanPayload({
      planId,
      studentId: student.id,
      schoolYear: input.schoolYear,
      actor: actorSnapshot,
      fullName: input.fullName,
      grade: input.grade,
      disability: input.disability,
      notes: input.notes,
      programType: input.programType
    });

    await tx.actionPlan.create({
      data: {
        id: planId,
        studentId: student.id,
        schoolYear: input.schoolYear,
        status: payload.status,
        version: 1,
        currentPayload: payload,
        createdById: actor.id,
        updatedById: actor.id,
        versions: {
          create: {
            version: 1,
            snapshot: payload,
            createdById: actor.id,
            note: "Почетна верзија"
          }
        }
      }
    });

    return tx.student.findUniqueOrThrow({
      where: {
        id: student.id
      },
      include: studentDetailInclude
    });
  });

  return {
    student: toStudentDetail(created),
    planId
  };
}

export async function updateStudent(actor: SessionUser, studentId: string, input: UpdateStudentInput) {
  const student = await prisma.student.findUnique({
    where: {
      id: studentId
    },
    include: studentDetailInclude
  });

  if (!student) {
    throw new ApiError(404, "Ученикот не е пронајден.");
  }

  assertStudentAccess(
    actor,
    student.assignments.map((assignment) => assignment.userId),
    "edit"
  );

  if (input.assignedUserIds && actor.role !== "admin") {
    throw new ApiError(403, "Само администратор може да ги менува доделените корисници.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: {
        id: studentId
      },
      data: {
        fullName: input.fullName ?? student.fullName,
        grade: input.grade ?? student.grade,
        programType: input.programType ?? student.programType,
        schoolYear: input.schoolYear ?? student.schoolYear,
        status: input.status ?? student.status,
        lastEditedAt: new Date(),
        lastEditedById: actor.id
      }
    });

    if (input.assignedUserIds) {
      await tx.studentAssignment.deleteMany({
        where: {
          studentId
        }
      });

      if (input.assignedUserIds.length > 0) {
        await tx.studentAssignment.createMany({
          data: Array.from(new Set(input.assignedUserIds)).map((userId) => ({
            studentId,
            userId,
            assignedById: actor.id
          })),
          skipDuplicates: true
        });
      }
    }

    return tx.student.findUniqueOrThrow({
      where: {
        id: studentId
      },
      include: studentDetailInclude
    });
  });

  return toStudentDetail(updated);
}

export async function deleteStudent(actor: SessionUser, studentId: string) {
  const student = await prisma.student.findUnique({
    where: {
      id: studentId
    },
    include: {
      assignments: true
    }
  });

  if (!student) {
    throw new ApiError(404, "Ученикот не е пронајден.");
  }

  assertStudentAccess(
    actor,
    student.assignments.map((assignment) => assignment.userId),
    "edit"
  );

  await prisma.student.delete({
    where: {
      id: studentId
    }
  });

  return {
    ok: true
  };
}

export async function getStudentPlanSeed(studentId: string) {
  const plan = await prisma.actionPlan.findFirst({
    where: {
      studentId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return plan ? payloadFromPrismaJson(plan) : null;
}
