import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, LOCALE_STORAGE_KEY, useI18n } from "./I18nContext";

describe("I18nContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("lang");
    document.documentElement.removeAttribute("dir");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns safe default Arabic translations when used outside provider", () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.locale).toBe("ar");
    expect(result.current.dir).toBe("rtl");
    expect(result.current.t.common.save).toBe("حفظ");
  });

  it("defaults to Arabic RTL", () => {
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    expect(result.current.locale).toBe("ar");
    expect(result.current.dir).toBe("rtl");
    expect(document.documentElement.getAttribute("lang")).toBe("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(result.current.t.common.save).toBe("حفظ");
  });

  it("loads stored locale from localStorage", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    expect(result.current.locale).toBe("en");
    expect(result.current.dir).toBe("ltr");
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    expect(result.current.t.common.save).toBe("Save");
  });

  it("switches locale and updates DOM and storage", () => {
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });

    act(() => {
      result.current.setLocale("en");
    });
    expect(result.current.locale).toBe("en");
    expect(result.current.dir).toBe("ltr");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");

    act(() => {
      result.current.setLocale("ar");
    });
    expect(result.current.locale).toBe("ar");
    expect(result.current.dir).toBe("rtl");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ar");
    expect(document.documentElement.getAttribute("lang")).toBe("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });

  it("toggles between ar and en", () => {
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });

    act(() => {
      result.current.toggleLocale();
    });
    expect(result.current.locale).toBe("en");

    act(() => {
      result.current.toggleLocale();
    });
    expect(result.current.locale).toBe("ar");
  });

  it("formats numbers, currencies and dates according to locale", () => {
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });

    const arNum = result.current.formatNumber(1250);
    const arMoney = result.current.formatMoney(500);
    const arDate = result.current.formatDate("2026-09-12T12:00:00Z");

    expect(typeof arNum).toBe("string");
    expect(typeof arMoney).toBe("string");
    expect(typeof arDate).toBe("string");

    act(() => {
      result.current.setLocale("en");
    });

    const enNum = result.current.formatNumber(1250);
    const enMoney = result.current.formatMoney(500);
    const enDate = result.current.formatDate("2026-09-12T12:00:00Z");

    expect(enNum).toBe("1,250");
    expect(enMoney).toContain("500");
    expect(typeof enDate).toBe("string");
  });
});
