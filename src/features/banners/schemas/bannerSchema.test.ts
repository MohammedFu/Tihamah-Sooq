import { describe, expect, it } from "vitest";
import {
  bannerSchema,
  getBannerLifecycleState,
} from "./bannerSchema";

describe("bannerSchema", () => {
  it("validates a minimal valid banner", () => {
    const result = bannerSchema.safeParse({
      imageUrl: "https://cdn.tihamah.com/banners/banner1.jpg",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageUrl).toBe("https://cdn.tihamah.com/banners/banner1.jpg");
    }
  });

  it("validates full banner details with valid target and dates", () => {
    const result = bannerSchema.safeParse({
      title: "موسم عسل السدر",
      imageUrl: "https://cdn.tihamah.com/banners/honey.jpg",
      sortOrder: 3,
      isActive: true,
      targetType: "category",
      targetId: 5,
      startsAt: "2026-09-01",
      endsAt: "2026-09-30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetId).toBe(5);
    }
  });

  it("rejects missing or invalid image URL", () => {
    const emptyResult = bannerSchema.safeParse({ imageUrl: "" });
    expect(emptyResult.success).toBe(false);

    const invalidUrl = bannerSchema.safeParse({ imageUrl: "not-a-url" });
    expect(invalidUrl.success).toBe(false);
    if (!invalidUrl.success) {
      expect(invalidUrl.error.issues[0].message).toContain("يجب إدخال رابط صورة صالح");
    }
  });

  it("requires a positive integer targetId when targetType is category or listing", () => {
    const catMissing = bannerSchema.safeParse({
      imageUrl: "https://cdn.tihamah.com/banners/test.jpg",
      targetType: "category",
      targetId: "",
    });
    expect(catMissing.success).toBe(false);
    if (!catMissing.success) {
      expect(catMissing.error.issues[0].message).toContain("معرّف القسم المطلوب");
    }

    const listingInvalid = bannerSchema.safeParse({
      imageUrl: "https://cdn.tihamah.com/banners/test.jpg",
      targetType: "listing",
      targetId: -3,
    });
    expect(listingInvalid.success).toBe(false);
    if (!listingInvalid.success) {
      expect(listingInvalid.error.issues[0].message).toContain("رقم الإعلان المطلوب");
    }
  });

  it("rejects end date before start date", () => {
    const result = bannerSchema.safeParse({
      imageUrl: "https://cdn.tihamah.com/banners/test.jpg",
      startsAt: "2026-09-15",
      endsAt: "2026-09-10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("تاريخ الانتهاء لا يمكن أن يسبق تاريخ البدء");
    }
  });
});

describe("getBannerLifecycleState", () => {
  const refDate = new Date("2026-09-10T12:00:00Z");

  it("returns 'expired' when endsAt is in the past even if isActive is true", () => {
    expect(
      getBannerLifecycleState(
        { isActive: true, endsAt: "2026-09-05" },
        refDate,
      ),
    ).toBe("expired");
  });

  it("returns 'scheduled' when startsAt is in the future and banner is active", () => {
    expect(
      getBannerLifecycleState(
        { isActive: true, startsAt: "2026-09-15" },
        refDate,
      ),
    ).toBe("scheduled");
  });

  it("returns 'active' when within dates and isActive is true", () => {
    expect(
      getBannerLifecycleState(
        {
          isActive: true,
          startsAt: "2026-09-01",
          endsAt: "2026-09-20",
        },
        refDate,
      ),
    ).toBe("active");
  });

  it("returns 'inactive' when isActive is false and not expired", () => {
    expect(
      getBannerLifecycleState(
        {
          isActive: false,
          startsAt: "2026-09-01",
          endsAt: "2026-09-20",
        },
        refDate,
      ),
    ).toBe("inactive");
  });
});
