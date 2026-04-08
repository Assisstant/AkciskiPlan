import { z } from "zod";
import { PLAN_STATUSES, PROGRAM_TYPES } from "@/lib/catalog/akciski-plan";

const nullableScaleSchema = z.number().int().min(0).max(4).nullable().optional();
const nullableLevelSchema = z.number().int().min(0).max(3).nullable().optional();

export const actorSnapshotSchema = z.object({
  id: z.string().default(""),
  username: z.string().default(""),
  displayName: z.string().default("")
});

export const exerciseQuarterSchema = z.object({
  scale: nullableScaleSchema,
  level: nullableLevelSchema,
  note: z.string().default("")
});

export const exerciseStateSchema = z.object({
  baseline: nullableScaleSchema,
  level: nullableLevelSchema,
  q: z.array(exerciseQuarterSchema).default([])
});

export const quarterReviewSchema = z.object({
  date: z.string().default(""),
  iopEval: z.string().default(""),
  revision: z.string().default(""),
  report: z.string().default(""),
  parentMeeting: z.string().default("")
});

export const actionPlanProfileSchema = z.object({
  fullName: z.string().default(""),
  grade: z.string().default(""),
  disability: z.string().default(""),
  notes: z.string().default(""),
  programType: z.enum(PROGRAM_TYPES).default("Редовна")
});

export const actionPlanPhaseASchema = z.object({
  date: z.string().default(""),
  observation: z.string().default(""),
  diagnostics: z.string().default(""),
  teamConf: z.string().default("")
});

export const actionPlanIopSchema = z.object({
  goals: z.string().default(""),
  strategies: z.string().default(""),
  adaptations: z.string().default(""),
  assistant: z.string().default("")
});

export const actionPlanYearEndSchema = z.object({
  summary: z.string().default(""),
  transition: z.string().default(""),
  summerNotes: z.string().default("")
});

export const actionPlanMetaSchema = z.object({
  createdAt: z.string().default(""),
  createdBy: actorSnapshotSchema,
  lastEditedAt: z.string().default(""),
  lastEditedBy: actorSnapshotSchema.nullable().default(null),
  sourceLegacyId: z.string().default("")
});

export const actionPlanPayloadV1Schema = z.object({
  schemaVersion: z.literal("1"),
  planId: z.string().min(1),
  studentId: z.string().min(1),
  schoolYear: z.string().min(1),
  status: z.enum(PLAN_STATUSES).default("active"),
  version: z.number().int().min(1).default(1),
  createdBy: actorSnapshotSchema,
  updatedBy: actorSnapshotSchema,
  updatedAt: z.string().default(""),
  profile: actionPlanProfileSchema,
  cabinets: z.array(z.string()).default([]),
  phaseA: actionPlanPhaseASchema,
  exercises: z.record(z.string(), exerciseStateSchema).default({}),
  quarters: z.array(quarterReviewSchema).default([]),
  iop: actionPlanIopSchema,
  yearEnd: actionPlanYearEndSchema,
  _meta: actionPlanMetaSchema
});

export const legacyActionPlanRecordSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().default(""),
    grade: z.string().default(""),
    disability: z.string().default(""),
    notes: z.string().default(""),
    cabinets: z.array(z.string()).default([]),
    programType: z.enum(PROGRAM_TYPES).default("Редовна"),
    phaseA: actionPlanPhaseASchema.default({ date: "", observation: "", diagnostics: "", teamConf: "" }),
    exercises: z.record(z.string(), exerciseStateSchema).default({}),
    quarters: z.array(quarterReviewSchema).default([]),
    iop: actionPlanIopSchema.default({ goals: "", strategies: "", adaptations: "", assistant: "" }),
    yearEnd: actionPlanYearEndSchema.default({ summary: "", transition: "", summerNotes: "" }),
    _meta: z
      .object({
        createdAt: z.string().optional(),
        createdBy: z.string().optional(),
        lastEditedAt: z.string().optional(),
        lastEditedBy: z.string().optional()
      })
      .optional()
  })
  .passthrough();

export const loginBodySchema = z.object({
  username: z.string().trim().min(1, "Внесете корисничко име."),
  password: z.string().min(1, "Внесете лозинка.")
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3),
  displayName: z.string().trim().min(2),
  password: z.string().min(8),
  role: z.enum(["admin", "editor", "viewer"])
});

export const updateUserSchema = z
  .object({
    displayName: z.string().trim().min(2).optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["admin", "editor", "viewer"]).optional(),
    active: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Потребна е барем една промена."
  });

export const createStudentSchema = z.object({
  fullName: z.string().trim().min(2),
  grade: z.string().default(""),
  programType: z.enum(PROGRAM_TYPES).default("Редовна"),
  schoolYear: z.string().trim().min(4),
  disability: z.string().default(""),
  notes: z.string().default(""),
  assignedUserIds: z.array(z.string()).default([])
});

export const updateStudentSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    grade: z.string().optional(),
    programType: z.enum(PROGRAM_TYPES).optional(),
    schoolYear: z.string().optional(),
    status: z.enum(["active", "archived"]).optional(),
    assignedUserIds: z.array(z.string()).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Нема промени за снимање."
  });

export const createPlanSchema = z.object({
  schoolYear: z.string().trim().min(4),
  copyFromPlanId: z.string().optional(),
  copyFromPrevious: z.boolean().default(true)
});

export const updatePlanSchema = z.object({
  expectedVersion: z.number().int().min(1),
  note: z.string().default(""),
  payload: z.unknown()
});

export const importPlanSchema = z.object({
  source: z.unknown()
});

export type ActorSnapshot = z.infer<typeof actorSnapshotSchema>;
export type ExerciseQuarter = z.infer<typeof exerciseQuarterSchema>;
export type ExerciseState = z.infer<typeof exerciseStateSchema>;
export type QuarterReview = z.infer<typeof quarterReviewSchema>;
export type ActionPlanPayloadV1 = z.infer<typeof actionPlanPayloadV1Schema>;
export type LegacyActionPlanRecord = z.infer<typeof legacyActionPlanRecordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
