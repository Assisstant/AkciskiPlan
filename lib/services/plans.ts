import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { actorToSnapshot, buildPlanExportPackage, clonePlanForSchoolYear, normalizeActionPlanPayload, parseImportPayloads, payloadFromPrismaJson, StudentSummary } from "@/lib/import-export";
import type { PlanImportResult } from "@/lib/import-export";
import { ApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { CreatePlanInput } from "@/lib/schemas/action-plan";
import { SessionUser } from "@/lib/session";
import { assertStudentAccess } from "@/lib/services/permissions";

const planInclude = {
  student: {
    include: {
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
    }
  },
  versions: {
    include: {
      createdBy: {
        select: {
          displayName: true,
          username: true
        }
      }
    },
    orderBy: {
      version: "desc" as const
    },
    take: 20
  },
  updatedBy: {
    select: {
      displayName: true,
      username: true
    }
  }
} satisfies Prisma.ActionPlanInclude;

type PlanWithRelations = Prisma.ActionPlanGetPayload<{
  include: typeof planInclude;
}>;

export type ActionPlanDetail = {
  id: string;
  studentId: string;
  schoolYear: string;
  status: string;
  version: number;
  updatedAt: string;
  updatedByName: string;
  payload: ReturnType<typeof payloadFromPrismaJson>;
  student: StudentSummary;
  versions: Array<{
    id: string;
    version: number;
    createdAt: string;
    createdBy: string;
    note: string;
  }>;
};

function toStudentSummary(plan: PlanWithRelations): StudentSummary {
  return {
    id: plan.student.id,
    fullName: plan.student.fullName,
    grade: plan.student.grade,
    programType: plan.student.programType,
    schoolYear: plan.student.schoolYear,
    status: plan.student.status,
    lastEditedAt: plan.student.lastEditedAt?.toISOString() ?? null,
    lastEditedByName: plan.student.lastEditedBy?.displayName ?? "",
    assignments: plan.student.assignments.map((assignment) => ({
      id: assignment.user.id,
      displayName: assignment.user.displayName,
      username: assignment.user.username,
      role: assignment.user.role
    })),
    plans: plan.student.plans.map((studentPlan) => ({
      id: studentPlan.id,
      schoolYear: studentPlan.schoolYear,
      version: studentPlan.version,
      status: studentPlan.status,
      updatedAt: studentPlan.updatedAt.toISOString()
    }))
  };
}

function toPlanDetail(plan: PlanWithRelations): ActionPlanDetail {
  return {
    id: plan.id,
    studentId: plan.studentId,
    schoolYear: plan.schoolYear,
    status: plan.status,
    version: plan.version,
    updatedAt: plan.updatedAt.toISOString(),
    updatedByName: plan.updatedBy.displayName,
    payload: payloadFromPrismaJson(plan),
    student: toStudentSummary(plan),
    versions: plan.versions.map((version) => ({
      id: version.id,
      version: version.version,
      createdAt: version.createdAt.toISOString(),
      createdBy: version.createdBy.displayName || version.createdBy.username,
      note: version.note
    }))
  };
}

export function assertExpectedVersion(currentVersion: number, expectedVersion: number) {
  if (currentVersion !== expectedVersion) {
    throw new ApiError(409, "Планот е променет од друг корисник. Вчитајте ја најновата верзија.", {
      currentVersion
    });
  }
}

async function getPlanOrThrow(actor: SessionUser, studentId: string, planId: string) {
  const plan = await prisma.actionPlan.findUnique({
    where: {
      id: planId
    },
    include: planInclude
  });

  if (!plan || plan.studentId !== studentId) {
    throw new ApiError(404, "Планот не е пронајден.");
  }

  assertStudentAccess(
    actor,
    plan.student.assignments.map((assignment) => assignment.userId),
    "view"
  );

  return plan;
}

export async function listPlansForStudent(actor: SessionUser, studentId: string) {
  const student = await prisma.student.findUnique({
    where: {
      id: studentId
    },
    include: {
      assignments: true,
      plans: {
        orderBy: {
          schoolYear: "desc"
        }
      }
    }
  });

  if (!student) {
    throw new ApiError(404, "Ученикот не е пронајден.");
  }

  assertStudentAccess(
    actor,
    student.assignments.map((assignment) => assignment.userId),
    "view"
  );

  return student.plans.map((plan) => ({
    id: plan.id,
    schoolYear: plan.schoolYear,
    status: plan.status,
    version: plan.version,
    updatedAt: plan.updatedAt.toISOString()
  }));
}

export async function getPlanForActor(actor: SessionUser, studentId: string, planId: string) {
  const plan = await getPlanOrThrow(actor, studentId, planId);
  return toPlanDetail(plan);
}

export async function createPlanForStudent(actor: SessionUser, studentId: string, input: CreatePlanInput) {
  const student = await prisma.student.findUnique({
    where: {
      id: studentId
    },
    include: {
      assignments: true,
      plans: {
        orderBy: {
          schoolYear: "desc"
        }
      }
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

  const duplicate = student.plans.find((plan) => plan.schoolYear === input.schoolYear);
  if (duplicate) {
    throw new ApiError(409, "Веќе постои план за оваа учебна година.");
  }

  const copySourceId = input.copyFromPlanId ?? (input.copyFromPrevious ? student.plans[0]?.id : undefined);
  const sourcePlan = copySourceId
    ? await prisma.actionPlan.findUnique({
        where: {
          id: copySourceId
        }
      })
    : null;

  const planId = randomUUID();
  const actorSnapshot = actorToSnapshot({
    id: actor.id,
    username: actor.username,
    displayName: actor.name ?? actor.username
  });
  const payload = sourcePlan
    ? clonePlanForSchoolYear(payloadFromPrismaJson(sourcePlan), input.schoolYear, actorSnapshot, planId)
    : normalizeActionPlanPayload({
        ...payloadFromPrismaJson({
          currentPayload: {
            schemaVersion: "1",
            planId,
            studentId,
            schoolYear: input.schoolYear,
            status: "active",
            version: 1,
            createdBy: actorSnapshot,
            updatedBy: actorSnapshot,
            updatedAt: new Date().toISOString(),
            profile: {
              fullName: student.fullName,
              grade: student.grade,
              disability: "",
              notes: "",
              programType: (student.programType || "Редовна") as "Редовна" | "Модифицирана" | "Индивидуална"
            },
            cabinets: [],
            phaseA: {},
            exercises: {},
            quarters: [],
            iop: {},
            yearEnd: {},
            _meta: {
              createdAt: new Date().toISOString(),
              createdBy: actorSnapshot,
              lastEditedAt: new Date().toISOString(),
              lastEditedBy: actorSnapshot,
              sourceLegacyId: ""
            }
          }
        }),
        planId,
        studentId,
        schoolYear: input.schoolYear
      });

  await prisma.$transaction(async (tx) => {
    await tx.actionPlan.create({
      data: {
        id: planId,
        studentId,
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
            note: sourcePlan ? `Копија од ${sourcePlan.schoolYear}` : "Почетна верзија"
          }
        }
      }
    });

    await tx.student.update({
      where: {
        id: studentId
      },
      data: {
        schoolYear: input.schoolYear,
        lastEditedAt: new Date(),
        lastEditedById: actor.id
      }
    });
  });

  return getPlanForActor(actor, studentId, planId);
}

export async function updatePlan(actor: SessionUser, studentId: string, planId: string, input: {
  expectedVersion: number;
  note?: string;
  payload: unknown;
}) {
  const current = await getPlanOrThrow(actor, studentId, planId);

  assertStudentAccess(
    actor,
    current.student.assignments.map((assignment) => assignment.userId),
    "edit"
  );

  assertExpectedVersion(current.version, input.expectedVersion);

  const actorSnapshot = actorToSnapshot({
    id: actor.id,
    username: actor.username,
    displayName: actor.name ?? actor.username
  });
  const payloadObject = typeof input.payload === "object" && input.payload !== null ? input.payload : {};
  const normalized = normalizeActionPlanPayload({
    ...payloadObject,
    planId,
    studentId,
    schoolYear: current.schoolYear,
    version: current.version + 1,
    createdBy: payloadFromPrismaJson(current).createdBy,
    updatedBy: actorSnapshot,
    updatedAt: new Date().toISOString(),
    _meta: {
      ...payloadFromPrismaJson(current)._meta,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: actorSnapshot
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.actionPlan.update({
      where: {
        id: planId
      },
      data: {
        version: normalized.version,
        status: normalized.status,
        currentPayload: normalized,
        updatedById: actor.id
      }
    });

    await tx.actionPlanVersion.create({
      data: {
        actionPlanId: planId,
        version: normalized.version,
        snapshot: normalized,
        createdById: actor.id,
        note: input.note?.trim() || "Автоматско снимање"
      }
    });

    await tx.student.update({
      where: {
        id: studentId
      },
      data: {
        fullName: normalized.profile.fullName,
        grade: normalized.profile.grade,
        programType: normalized.profile.programType,
        schoolYear: normalized.schoolYear,
        lastEditedAt: new Date(),
        lastEditedById: actor.id
      }
    });
  });

  return getPlanForActor(actor, studentId, planId);
}

export async function importPlan(actor: SessionUser, studentId: string, planId: string, source: unknown): Promise<PlanImportResult & { plan: ActionPlanDetail }> {
  const current = await getPlanOrThrow(actor, studentId, planId);

  assertStudentAccess(
    actor,
    current.student.assignments.map((assignment) => assignment.userId),
    "edit"
  );

  const payloads = parseImportPayloads(source, {
    studentId,
    schoolYear: current.schoolYear,
    actor: actorToSnapshot({
      id: actor.id,
      username: actor.username,
      displayName: actor.name ?? actor.username
    })
  });

  if (payloads.length === 0) {
    throw new ApiError(400, "Нема валидни податоци за увоз.");
  }

  const chosen =
    payloads.find((payload) => payload.planId === planId || payload.studentId === studentId) ??
    payloads[0];

  const updated = await updatePlan(actor, studentId, planId, {
    expectedVersion: current.version,
    note: "Увоз од JSON",
    payload: {
      ...chosen,
      planId,
      studentId,
      schoolYear: current.schoolYear
    }
  });

  return {
    created: 0,
    updated: 1,
    skipped: Math.max(0, payloads.length - 1),
    errors: [],
    plan: updated
  };
}

export async function exportPlan(actor: SessionUser, studentId: string, planId: string) {
  const plan = await getPlanOrThrow(actor, studentId, planId);

  return buildPlanExportPackage({
    student: toStudentSummary(plan),
    plan: payloadFromPrismaJson(plan),
    versions: plan.versions.map((version) => ({
      id: version.id,
      version: version.version,
      createdAt: version.createdAt.toISOString(),
      createdBy: version.createdBy.displayName || version.createdBy.username,
      snapshot: normalizeActionPlanPayload(version.snapshot),
      note: version.note
    }))
  });
}
