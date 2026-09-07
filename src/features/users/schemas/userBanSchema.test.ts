import { describe, expect, it } from "vitest";
import { userBanSchema } from "./userBanSchema";

describe("userBanSchema", () => {
  it("accepts valid ban reasons and trims surrounding whitespace", () => {
    const result = userBanSchema.safeParse({ reason: "  تكرار نشر إعلانات مضللة  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("تكرار نشر إعلانات مضللة");
    }
  });

  it("rejects empty or whitespace-only reasons", () => {
    expect(userBanSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(userBanSchema.safeParse({ reason: "   " }).success).toBe(false);
  });

  it("rejects reasons shorter than 3 characters", () => {
    const result = userBanSchema.safeParse({ reason: "لا" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("يجب أن يحتوي سبب الحظر على 3 أحرف على الأقل.");
    }
  });

  it("rejects reasons exceeding 500 characters", () => {
    const longReason = "أ".repeat(501);
    const result = userBanSchema.safeParse({ reason: longReason });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("يجب ألا يتجاوز سبب الحظر 500 حرف.");
    }
  });
});
