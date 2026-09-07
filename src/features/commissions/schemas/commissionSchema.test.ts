import { describe, expect, it } from "vitest";
import { commissionRejectionSchema } from "./commissionSchema";

describe("commissionRejectionSchema", () => {
  it("accepts valid rejection reasons with or without notes", () => {
    const validNoNotes = commissionRejectionSchema.safeParse({
      reason: "مبلغ التحويل غير مطابق للعمولة المستحقة",
    });
    expect(validNoNotes.success).toBe(true);

    const validWithNotes = commissionRejectionSchema.safeParse({
      reason: "إيصال التحويل غير واضح",
      notes: "يرجى إعادة رفع إشعار تحويل بدقة أعلى وتوضيح رقم العملية.",
    });
    expect(validWithNotes.success).toBe(true);
  });

  it("rejects empty, missing, or too short reason", () => {
    const empty = commissionRejectionSchema.safeParse({ reason: "" });
    expect(empty.success).toBe(false);

    const whitespace = commissionRejectionSchema.safeParse({ reason: "   " });
    expect(whitespace.success).toBe(false);

    const tooShort = commissionRejectionSchema.safeParse({ reason: "لا" });
    expect(tooShort.success).toBe(false);
  });

  it("rejects reasons exceeding 200 characters", () => {
    const longReason = commissionRejectionSchema.safeParse({
      reason: "أ".repeat(201),
    });
    expect(longReason.success).toBe(false);
  });

  it("rejects notes exceeding 500 characters", () => {
    const longNotes = commissionRejectionSchema.safeParse({
      reason: "إيصال غير واضح",
      notes: "م".repeat(501),
    });
    expect(longNotes.success).toBe(false);
  });
});
