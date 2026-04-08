import { describe, expect, it } from "vitest";
import { normalizeActionPlanPayload } from "@/lib/import-export";

describe("Action plan schema", () => {
  it("fills missing quarter and exercise defaults", () => {
    const payload = normalizeActionPlanPayload({
      schemaVersion: "1",
      planId: "plan-1",
      studentId: "student-1",
      schoolYear: "2025 / 2026",
      status: "active",
      version: 1,
      createdBy: { id: "u1", username: "admin", displayName: "Admin" },
      updatedBy: { id: "u1", username: "admin", displayName: "Admin" },
      updatedAt: "2026-04-07T10:00:00.000Z",
      profile: {
        fullName: "Тест Ученик",
        grade: "V",
        disability: "",
        notes: "",
        programType: "Редовна"
      },
      cabinets: ["logo"],
      phaseA: {},
      exercises: {
        "logo::Артикулација": {
          baseline: 2,
          level: 1,
          q: [{ scale: 2, level: 1, note: "Q1" }]
        }
      },
      quarters: [{}],
      iop: {},
      yearEnd: {},
      _meta: {
        createdAt: "2026-04-07T10:00:00.000Z",
        createdBy: { id: "u1", username: "admin", displayName: "Admin" },
        lastEditedAt: "2026-04-07T10:00:00.000Z",
        lastEditedBy: { id: "u1", username: "admin", displayName: "Admin" },
        sourceLegacyId: ""
      }
    });

    expect(payload.quarters).toHaveLength(4);
    expect(payload.exercises["logo::Артикулација"].q).toHaveLength(4);
    expect(payload.exercises["logo::Артикулација"].q[1].note).toBe("");
  });
});
