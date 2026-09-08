import { describe, expect, it } from "vitest";
import { categorySchema } from "./categorySchema";

describe("categorySchema", () => {
  it("trims and accepts valid category data", () => {
    const result = categorySchema.parse({
      name: "  مستلزمات زراعية  ",
      iconUrl: "  https://cdn.tihamah.com/icons/wheat.svg  ",
      sortOrder: 3,
      isActive: true,
    });

    expect(result).toEqual({
      name: "مستلزمات زراعية",
      iconUrl: "https://cdn.tihamah.com/icons/wheat.svg",
      sortOrder: 3,
      isActive: true,
    });
  });

  it("accepts minimal valid category data", () => {
    const result = categorySchema.parse({
      name: "تمور",
    });

    expect(result).toEqual({
      name: "تمور",
    });
  });

  it("accepts empty string for iconUrl", () => {
    const result = categorySchema.parse({
      name: "أجهزة منزلية",
      iconUrl: "",
    });

    expect(result.iconUrl).toBe("");
  });

  it("rejects blank, short, and excessively long names", () => {
    expect(categorySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "أ" }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "م".repeat(81) }).success).toBe(false);
  });

  it("rejects invalid icon URLs", () => {
    expect(categorySchema.safeParse({ name: "قسم تجريبي", iconUrl: "not-a-url" }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "قسم تجريبي", iconUrl: "ftp://files.com/icon.svg" }).success).toBe(false);
  });

  it("accepts http and https URLs for iconUrl", () => {
    expect(categorySchema.safeParse({ name: "قسم", iconUrl: "http://example.com/icon.png" }).success).toBe(true);
    expect(categorySchema.safeParse({ name: "قسم", iconUrl: "https://example.com/icon.svg" }).success).toBe(true);
  });

  it("validates sortOrder as non-negative integer", () => {
    expect(categorySchema.safeParse({ name: "قسم", sortOrder: 0 }).success).toBe(true);
    expect(categorySchema.safeParse({ name: "قسم", sortOrder: 10 }).success).toBe(true);
    expect(categorySchema.safeParse({ name: "قسم", sortOrder: -1 }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "قسم", sortOrder: 2.5 }).success).toBe(false);
  });
});
