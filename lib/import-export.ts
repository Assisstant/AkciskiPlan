import { randomUUID } from "crypto";
import { ActionPlan } from "@prisma/client";
import { actionPlanPayloadV1Schema, ActionPlanPayloadV1, ActorSnapshot, exerciseQuarterSchema, exerciseStateSchema, legacyActionPlanRecordSchema, LegacyActionPlanRecord, QuarterReview, quarterReviewSchema } from "@/lib/schemas/action-plan";
import { deepClone, nowIso } from "@/lib/utils";

export type StudentSummary = {
  id: string;
  fullName: string;
  grade: string;
  programType: string;
  schoolYear: string;
  status: "active" | "archived";
  lastEditedAt: string | null;
  lastEditedByName: string;
  assignments: Array<{
    id: string;
    displayName: string;
    username: string;
    role: "admin" | "editor" | "viewer";
  }>;
  plans: Array<{
    id: string;
    schoolYear: string;
    version: number;
    status: string;
    updatedAt: string;
  }>;
};

export type PlanImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function emptyQuarter(): QuarterReview {
  return quarterReviewSchema.parse({});
}

function emptyExerciseQuarter() {
  return exerciseQuarterSchema.parse({});
}

function normalizeExerciseMap(exercises: Record<string, unknown>) {
  const normalized: ActionPlanPayloadV1["exercises"] = {};

  for (const [key, raw] of Object.entries(exercises ?? {})) {
    const parsed = exerciseStateSchema.parse(raw);
    normalized[key] = {
      baseline: parsed.baseline ?? null,
      level: parsed.level ?? null,
      q: Array.from({ length: 4 }, (_, index) => parsed.q[index] ? exerciseQuarterSchema.parse(parsed.q[index]) : emptyExerciseQuarter())
    };
  }

  return normalized;
}

export function deriveSchoolYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = month >= 8 ? year : year - 1;
  return `${start} / ${start + 1}`;
}

export function normalizeActionPlanPayload(payload: unknown): ActionPlanPayloadV1 {
  const parsed = actionPlanPayloadV1Schema.parse(payload);

  return {
    ...parsed,
    profile: {
      ...parsed.profile
    },
    phaseA: {
      ...parsed.phaseA
    },
    exercises: normalizeExerciseMap(parsed.exercises),
    quarters: Array.from({ length: 4 }, (_, index) => parsed.quarters[index] ? quarterReviewSchema.parse(parsed.quarters[index]) : emptyQuarter()),
    iop: {
      ...parsed.iop
    },
    yearEnd: {
      ...parsed.yearEnd
    },
    _meta: {
      ...parsed._meta,
      lastEditedBy: parsed._meta.lastEditedBy ?? null
    }
  };
}

export function actorToSnapshot(actor: {
  id: string;
  username: string;
  displayName?: string | null;
}): ActorSnapshot {
  return {
    id: actor.id,
    username: actor.username,
    displayName: actor.displayName ?? actor.username
  };
}

export function buildEmptyActionPlanPayload(input: {
  planId?: string;
  studentId: string;
  schoolYear: string;
  actor: ActorSnapshot;
  fullName?: string;
  grade?: string;
  disability?: string;
  notes?: string;
  programType?: ActionPlanPayloadV1["profile"]["programType"];
}): ActionPlanPayloadV1 {
  const timestamp = nowIso();

  return normalizeActionPlanPayload({
    schemaVersion: "1",
    planId: input.planId ?? randomUUID(),
    studentId: input.studentId,
    schoolYear: input.schoolYear,
    status: "active",
    version: 1,
    createdBy: input.actor,
    updatedBy: input.actor,
    updatedAt: timestamp,
    profile: {
      fullName: input.fullName ?? "",
      grade: input.grade ?? "",
      disability: input.disability ?? "",
      notes: input.notes ?? "",
      programType: input.programType ?? "Редовна"
    },
    cabinets: [],
    phaseA: {},
    exercises: {},
    quarters: [],
    iop: {},
    yearEnd: {},
    _meta: {
      createdAt: timestamp,
      createdBy: input.actor,
      lastEditedAt: timestamp,
      lastEditedBy: input.actor,
      sourceLegacyId: ""
    }
  });
}

export function clonePlanForSchoolYear(payload: ActionPlanPayloadV1, schoolYear: string, actor: ActorSnapshot, newPlanId: string) {
  const cloned = deepClone(payload);
  const timestamp = nowIso();

  cloned.planId = newPlanId;
  cloned.schoolYear = schoolYear;
  cloned.version = 1;
  cloned.createdBy = actor;
  cloned.updatedBy = actor;
  cloned.updatedAt = timestamp;
  cloned._meta.createdAt = timestamp;
  cloned._meta.createdBy = actor;
  cloned._meta.lastEditedAt = timestamp;
  cloned._meta.lastEditedBy = actor;

  return normalizeActionPlanPayload(cloned);
}

export function mapLegacyRecordToPayload(input: {
  legacy: LegacyActionPlanRecord;
  studentId: string;
  planId: string;
  schoolYear: string;
  actor: ActorSnapshot;
}): ActionPlanPayloadV1 {
  const timestamp = input.legacy._meta?.lastEditedAt ?? input.legacy._meta?.createdAt ?? nowIso();
  const createdBy = input.legacy._meta?.createdBy
    ? {
        id: input.actor.id,
        username: input.legacy._meta.createdBy,
        displayName: input.legacy._meta.createdBy
      }
    : input.actor;
  const updatedBy = input.legacy._meta?.lastEditedBy
    ? {
        id: input.actor.id,
        username: input.legacy._meta.lastEditedBy,
        displayName: input.legacy._meta.lastEditedBy
      }
    : createdBy;

  return normalizeActionPlanPayload({
    schemaVersion: "1",
    planId: input.planId,
    studentId: input.studentId,
    schoolYear: input.schoolYear,
    status: "active",
    version: 1,
    createdBy,
    updatedBy,
    updatedAt: timestamp,
    profile: {
      fullName: input.legacy.name,
      grade: input.legacy.grade,
      disability: input.legacy.disability,
      notes: input.legacy.notes,
      programType: input.legacy.programType
    },
    cabinets: input.legacy.cabinets,
    phaseA: input.legacy.phaseA,
    exercises: input.legacy.exercises,
    quarters: input.legacy.quarters,
    iop: input.legacy.iop,
    yearEnd: input.legacy.yearEnd,
    _meta: {
      createdAt: input.legacy._meta?.createdAt ?? timestamp,
      createdBy,
      lastEditedAt: timestamp,
      lastEditedBy: updatedBy,
      sourceLegacyId: input.legacy.id ?? ""
    }
  });
}

export function mapPayloadToLegacyRecord(payload: ActionPlanPayloadV1) {
  return {
    id: payload.planId,
    name: payload.profile.fullName,
    grade: payload.profile.grade,
    disability: payload.profile.disability,
    notes: payload.profile.notes,
    cabinets: payload.cabinets,
    programType: payload.profile.programType,
    phaseA: payload.phaseA,
    exercises: payload.exercises,
    quarters: payload.quarters,
    iop: payload.iop,
    yearEnd: payload.yearEnd,
    _meta: {
      createdAt: payload._meta.createdAt,
      createdBy: payload._meta.createdBy.username,
      lastEditedAt: payload._meta.lastEditedAt,
      lastEditedBy: payload._meta.lastEditedBy?.username ?? ""
    }
  };
}

export function parseImportPayloads(source: unknown, fallback: {
  studentId: string;
  schoolYear: string;
  actor: ActorSnapshot;
}) {
  const items = Array.isArray(source)
    ? source
    : typeof source === "object" && source !== null && "plan" in source
      ? [(source as { plan: unknown }).plan]
      : typeof source === "object" && source !== null && "current" in source
        ? [(source as { current: unknown }).current]
        : [source];

  return items.map((item) => {
    const maybeV1 = actionPlanPayloadV1Schema.safeParse(item);
    if (maybeV1.success) {
      return normalizeActionPlanPayload({
        ...maybeV1.data,
        studentId: fallback.studentId,
        schoolYear: maybeV1.data.schoolYear || fallback.schoolYear
      });
    }

    const legacy = legacyActionPlanRecordSchema.parse(item);
    return mapLegacyRecordToPayload({
      legacy,
      studentId: fallback.studentId,
      planId: randomUUID(),
      schoolYear: fallback.schoolYear,
      actor: fallback.actor
    });
  });
}

export function buildPlanExportPackage(input: {
  student: StudentSummary;
  plan: ActionPlanPayloadV1;
  versions: Array<{
    id: string;
    version: number;
    createdAt: string;
    createdBy: string;
    snapshot: ActionPlanPayloadV1;
    note: string;
  }>;
}) {
  return {
    type: "akciski-plan-export",
    schemaVersion: "1",
    exportedAt: nowIso(),
    student: input.student,
    plan: input.plan,
    current: input.plan,
    versions: input.versions
  };
}

export function payloadFromPrismaJson(plan: Pick<ActionPlan, "currentPayload">) {
  return normalizeActionPlanPayload(plan.currentPayload);
}
