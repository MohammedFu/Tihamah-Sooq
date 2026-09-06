import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(resolve("src/styles/tokens.css"), "utf8");
const styles = readFileSync(resolve("src/styles/index.css"), "utf8");
const main = readFileSync(resolve("src/main.tsx"), "utf8");

describe("design system contract", () => {
  it("preserves the source PDF palette and self-hosted Tajawal typography", () => {
    expect(tokens).toMatch(/--color-rural-bg:\s*#f9fafb/i);
    expect(tokens).toMatch(/--color-rural-gold:\s*#f59e0b/i);
    expect(tokens).toMatch(/--color-rural-amber:\s*#d97706/i);
    expect(tokens).toMatch(/--color-rural-green:\s*#2d6a4f/i);
    expect(tokens).toMatch(/--color-rural-dark:\s*#1b4332/i);
    expect(tokens).toContain('--font-family-sans: "Tajawal"');
    for (const weight of [400, 500, 700, 800]) {
      expect(main).toContain(`@fontsource/tajawal/${weight}.css`);
    }
  });

  it("keeps component colors behind declared tokens", () => {
    const declarations = new Set([...tokens.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((match) => match[1]));
    const references = [...styles.matchAll(/var\((--[a-z0-9-]+)/gi)].map((match) => match[1]);
    const unresolved = references.filter((reference) => !declarations.has(reference));

    expect(unresolved).toEqual([]);
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it("provides shared focus, control, card and reduced-motion states", () => {
    expect(styles).toMatch(/:focus-visible\s*\{/);
    expect(styles).toContain("border-radius: var(--radius-card)");
    expect(styles).toContain("min-height: var(--control-height)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
