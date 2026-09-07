import { describe, expect, it } from "vitest";
import { listingRejectionSchema } from "./listingModerationSchema";

describe("listing rejection validation", () => {
  it("requires a selected reason and trims accepted review text", () => {
    expect(listingRejectionSchema.safeParse({ reason: " ", notes: "" }).success).toBe(false);
    expect(listingRejectionSchema.parse({ reason: " سعر وهمي ", notes: " مراجعة يدوية " })).toEqual({ reason: "سعر وهمي", notes: "مراجعة يدوية" });
  });

  it("limits notes retained in the local confirmation form", () => {
    expect(listingRejectionSchema.safeParse({ reason: "سلعة ممنوعة", notes: "س".repeat(501) }).success).toBe(false);
  });
});
