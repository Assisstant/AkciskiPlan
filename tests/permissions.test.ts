import { describe, expect, it } from "vitest";
import { canAccessStudent } from "@/lib/services/permissions";

describe("Student permissions", () => {
  it("allows admins to access everything", () => {
    expect(canAccessStudent({ id: "a1", role: "admin" }, [], "manage")).toBe(true);
  });

  it("allows assigned editors to edit", () => {
    expect(canAccessStudent({ id: "e1", role: "editor" }, ["e1"], "edit")).toBe(true);
  });

  it("blocks viewers from editing even when assigned", () => {
    expect(canAccessStudent({ id: "v1", role: "viewer" }, ["v1"], "edit")).toBe(false);
    expect(canAccessStudent({ id: "v1", role: "viewer" }, ["v1"], "view")).toBe(true);
  });
});
