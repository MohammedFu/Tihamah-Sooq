import { describe, expect, it } from "vitest";
import {
  calculateExpectedCommission,
  formatCurrency,
  isCommissionMismatch,
} from "./commissionCalculations";

describe("calculateExpectedCommission", () => {
  it("calculates 1% of standard sold price", () => {
    expect(calculateExpectedCommission(15000)).toBe(150);
    expect(calculateExpectedCommission(500)).toBe(5);
    expect(calculateExpectedCommission(125.5)).toBe(1.26);
  });

  it("applies 1.00 SAR floor minimum for small prices", () => {
    expect(calculateExpectedCommission(50)).toBe(1.0);
    expect(calculateExpectedCommission(10)).toBe(1.0);
    expect(calculateExpectedCommission(1)).toBe(1.0);
  });

  it("returns null for non-positive or invalid sold price", () => {
    expect(calculateExpectedCommission(0)).toBeNull();
    expect(calculateExpectedCommission(-100)).toBeNull();
    expect(calculateExpectedCommission(null)).toBeNull();
    expect(calculateExpectedCommission(undefined)).toBeNull();
    expect(calculateExpectedCommission(Number.NaN)).toBeNull();
  });
});

describe("isCommissionMismatch", () => {
  it("returns false when actual matches expected 1%", () => {
    expect(isCommissionMismatch(150, 15000)).toBe(false);
    expect(isCommissionMismatch(1.0, 50)).toBe(false);
  });

  it("returns true when actual diverges from expected 1% beyond tolerance", () => {
    // Expected for 15000 is 150; actual is 100
    expect(isCommissionMismatch(100, 15000)).toBe(true);
    // Expected for 15000 is 150; actual is 150.05
    expect(isCommissionMismatch(150.05, 15000)).toBe(true);
  });

  it("handles boundary tolerance (<= 0.01 is not a mismatch)", () => {
    // 150.005 is within 0.01 tolerance
    expect(isCommissionMismatch(150.005, 15000)).toBe(false);
  });

  it("returns false when sold price or actual amount is missing or invalid", () => {
    expect(isCommissionMismatch(150, null)).toBe(false);
    expect(isCommissionMismatch(150, 0)).toBe(false);
    expect(isCommissionMismatch(null, 15000)).toBe(false);
    expect(isCommissionMismatch(undefined, 15000)).toBe(false);
    expect(isCommissionMismatch(Number.NaN, 15000)).toBe(false);
  });
});

describe("formatCurrency", () => {
  it("formats valid numbers with SAR currency", () => {
    const formatted = formatCurrency(150);
    expect(formatted).toContain("١٥٠");
    expect(formatted).toContain("ر.س");
  });

  it("handles null, undefined, and NaN gracefully", () => {
    expect(formatCurrency(null)).toBe("غير متاح");
    expect(formatCurrency(undefined)).toBe("غير متاح");
    expect(formatCurrency(Number.NaN)).toBe("غير متاح");
  });
});
