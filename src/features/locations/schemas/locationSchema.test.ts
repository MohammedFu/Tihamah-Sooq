import { describe, expect, it } from "vitest";
import { locationSchema } from "./locationSchema";

describe("location form schema", () => {
  it("trims valid Arabic names", () => {
    expect(locationSchema.parse({ name: "  سهل تهامة  " })).toEqual({ name: "سهل تهامة" });
  });

  it("rejects blank, one-character, and overlong names", () => {
    expect(locationSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(locationSchema.safeParse({ name: "س" }).success).toBe(false);
    expect(locationSchema.safeParse({ name: "م".repeat(81) }).success).toBe(false);
  });
});
