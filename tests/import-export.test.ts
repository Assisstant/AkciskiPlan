import { describe, expect, it } from "vitest";
import { mapLegacyRecordToPayload, mapPayloadToLegacyRecord, parseImportPayloads } from "@/lib/import-export";

describe("Import/export mapping", () => {
  it("maps a legacy record into the v1 payload", () => {
    const payload = mapLegacyRecordToPayload({
      legacy: {
        id: "legacy-1",
        name: "Мила",
        grade: "III",
        disability: "Тест",
        notes: "Белешка",
        cabinets: ["psih"],
        programType: "Индивидуална",
        phaseA: { date: "01.09.2025", observation: "obs", diagnostics: "", teamConf: "" },
        exercises: {},
        quarters: [],
        iop: { goals: "", strategies: "", adaptations: "", assistant: "" },
        yearEnd: { summary: "", transition: "", summerNotes: "" },
        _meta: { createdAt: "2026-04-07T10:00:00.000Z", createdBy: "BN" }
      },
      studentId: "student-1",
      planId: "plan-1",
      schoolYear: "2025 / 2026",
      actor: { id: "u1", username: "admin", displayName: "Admin" }
    });

    expect(payload.profile.fullName).toBe("Мила");
    expect(payload.profile.programType).toBe("Индивидуална");
    expect(payload._meta.sourceLegacyId).toBe("legacy-1");
  });

  it("parses legacy arrays and export packages", () => {
    const payloads = parseImportPayloads(
      {
        plan: mapLegacyRecordToPayload({
          legacy: {
            name: "Петар",
            grade: "IV",
            disability: "",
            notes: "",
            cabinets: [],
            programType: "Редовна",
            phaseA: { date: "", observation: "", diagnostics: "", teamConf: "" },
            exercises: {},
            quarters: [],
            iop: { goals: "", strategies: "", adaptations: "", assistant: "" },
            yearEnd: { summary: "", transition: "", summerNotes: "" }
          },
          studentId: "student-2",
          planId: "plan-2",
          schoolYear: "2025 / 2026",
          actor: { id: "u1", username: "admin", displayName: "Admin" }
        })
      },
      {
        studentId: "student-2",
        schoolYear: "2025 / 2026",
        actor: { id: "u1", username: "admin", displayName: "Admin" }
      }
    );

    expect(payloads).toHaveLength(1);
    expect(mapPayloadToLegacyRecord(payloads[0]).name).toBe("Петар");
  });
});
