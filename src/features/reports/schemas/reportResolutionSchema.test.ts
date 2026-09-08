import { describe, expect, it } from "vitest";
import { reportResolutionSchema } from "./reportResolutionSchema";

describe("reportResolutionSchema", () => {
  it("accepts valid actions with sufficient notes", () => {
    const validDismiss = reportResolutionSchema.safeParse({
      action: "dismiss",
      notes: "تم التواصل مع المشتري وتبين أن البلاغ غير دقيق.",
    });
    expect(validDismiss.success).toBe(true);

    const validDelete = reportResolutionSchema.safeParse({
      action: "delete_listing",
      notes: "الإعلان يحتوي على صور لسلعة ممنوعة في السوق.",
    });
    expect(validDelete.success).toBe(true);

    const validBan = reportResolutionSchema.safeParse({
      action: "ban_user",
      notes: "المعلن مكرر للمخالفات وحاول الاحتيال عبر التحويلات.",
    });
    expect(validBan.success).toBe(true);
  });

  it("rejects empty or missing notes", () => {
    const empty = reportResolutionSchema.safeParse({
      action: "dismiss",
      notes: "",
    });
    expect(empty.success).toBe(false);

    const whitespaceOnly = reportResolutionSchema.safeParse({
      action: "dismiss",
      notes: "    ",
    });
    expect(whitespaceOnly.success).toBe(false);

    const tooShort = reportResolutionSchema.safeParse({
      action: "dismiss",
      notes: "تم",
    });
    expect(tooShort.success).toBe(false);
  });

  it("rejects notes exceeding 500 characters", () => {
    const longNotes = reportResolutionSchema.safeParse({
      action: "dismiss",
      notes: "م".repeat(501),
    });
    expect(longNotes.success).toBe(false);
  });

  it("rejects invalid action types", () => {
    const invalidAction = reportResolutionSchema.safeParse({
      action: "unknown_action",
      notes: "ملاحظات سليمة وكافية للتدقيق",
    });
    expect(invalidAction.success).toBe(false);
  });
});
