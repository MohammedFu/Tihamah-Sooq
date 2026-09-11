import { describe, expect, it } from "vitest";
import { ar } from "./locales/ar";
import { en } from "./locales/en";

describe("i18n dictionaries parity", () => {
  it("ensures ar and en have identical top-level sections", () => {
    const arSections = Object.keys(ar).sort();
    const enSections = Object.keys(en).sort();
    expect(arSections).toEqual(enSections);
  });

  it("ensures every section has identical keys between ar and en", () => {
    for (const section of Object.keys(ar) as Array<keyof typeof ar>) {
      const arKeys = Object.keys(ar[section]).sort();
      const enKeys = Object.keys(en[section]).sort();
      expect(enKeys, `Section "${section}" keys mismatch`).toEqual(arKeys);

      // Verify no empty string values
      for (const key of arKeys) {
        const arVal = (ar[section] as any)[key];
        const enVal = (en[section] as any)[key];
        expect(typeof arVal, `ar.${section}.${key} is not string`).toBe("string");
        expect(typeof enVal, `en.${section}.${key} is not string`).toBe("string");
        expect(arVal.trim().length, `ar.${section}.${key} is empty`).toBeGreaterThan(0);
        expect(enVal.trim().length, `en.${section}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});
