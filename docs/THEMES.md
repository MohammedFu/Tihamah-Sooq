# Multi-Theme Architecture & Rural Aesthetics

## Overview

The Tihamah-Sooq Dashboard supports a complete multi-theme system tailored to the rural marketplace identity:
- **Light Theme (Tihamah Day):** Warm rural parchment background (`--color-rural-bg: #f9fafb`), deep forest green typography (`--color-rural-dark: #1b4332`), and warm amber/gold accents (`--color-primary: #b45309`).
- **Dark Theme (Rural Night):** Deep night canopy background (`--color-canvas: #0b1712`), elevated surface containers (`--color-surface: #13251c`), vibrant emerald accents (`--color-secondary: #34d399`), and luminous gold highlights (`--color-primary: #f59e0b`).
- **System Theme:** Automatically synchronizes with the user's OS color scheme (`prefers-color-scheme: dark`), dynamically adapting when the OS switches.

---

## Token System & CSS Invariants

All design tokens are defined centrally in [`src/styles/tokens.css`](file:///d:/dashboard/Tihamah-Sooq/src/styles/tokens.css).

### Architectural Invariant
As strictly validated by [`src/styles/tokens.test.ts`](file:///d:/dashboard/Tihamah-Sooq/src/styles/tokens.test.ts):
- Component styles in `src/styles/index.css` **must never contain hardcoded hex colors (`#...`) or `rgba(...)` functions**.
- Every single color rule must consume semantic CSS variables (e.g. `var(--color-surface)`, `var(--color-text)`, `var(--color-primary)`, `var(--color-border)`).
- Hex colors and alpha channels are confined strictly to `tokens.css`.

### Theme Switching Mechanism
1. The active theme is applied as a `data-theme="light" | "dark" | "system"` attribute on `document.documentElement`.
2. When `data-theme="system"`, CSS `@media (prefers-color-scheme: dark)` overrides automatically take effect.
3. User preferences are persisted in `localStorage` under the key `tihamah_theme`.

---

## Developer Usage

### 1. `useTheme` Hook
```tsx
import { useTheme } from "../context/ThemeContext";

function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  // theme: "light" | "dark" | "system"
  // resolvedTheme: "light" | "dark"
}
```

### 2. `ThemeToggle` Component
Mounted in the global header:
```tsx
import { ThemeToggle } from "../components/ui/ThemeToggle";

<ThemeToggle />
```
Provides an accessible button cycling through Light, Dark, and System preferences with accessible `aria-label` and `title` tooltips.
