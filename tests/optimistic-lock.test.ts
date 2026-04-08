import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/http";
import { assertExpectedVersion } from "@/lib/services/plans";

describe("Optimistic lock", () => {
  it("accepts matching versions", () => {
    expect(() => assertExpectedVersion(4, 4)).not.toThrow();
  });

  it("throws a conflict when versions do not match", () => {
    try {
      assertExpectedVersion(5, 4);
      throw new Error("Expected conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
    }
  });
});
