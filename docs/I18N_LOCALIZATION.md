# Internationalization (i18n) & RTL/LTR Localization

## Overview

The Tihamah-Sooq Dashboard is engineered with first-class bilingual support for Arabic (RTL, default) and English (LTR).

When switching languages, the application dynamically flips:
1. `document.documentElement.setAttribute("lang", locale)` (`"ar"` or `"en"`).
2. `document.documentElement.setAttribute("dir", dir)` (`"rtl"` or `"ltr"`).
3. Logical CSS layout rules (`margin-inline-start`, `border-inline-start`, padding, flex alignments).
4. Localized formatting for numbers, currency, and dates.

---

## Dictionary Structure & Type Safety

All translations are defined under [`src/i18n/`](file:///d:/dashboard/Tihamah-Sooq/src/i18n/):
- [`src/i18n/types.ts`](file:///d:/dashboard/Tihamah-Sooq/src/i18n/types.ts): Strict TypeScript schema for all translation sections (`common`, `nav`, `theme`, `lang`, `dashboard`, `listings`, `users`, `commissions`, `reports`, `system`, `errors`, `actions`).
- [`src/i18n/locales/ar.ts`](file:///d:/dashboard/Tihamah-Sooq/src/i18n/locales/ar.ts): Authoritative Arabic translations.
- [`src/i18n/locales/en.ts`](file:///d:/dashboard/Tihamah-Sooq/src/i18n/locales/en.ts): Full-parity English translations.

### Automated Key Parity Test
[`src/i18n/locales.test.ts`](file:///d:/dashboard/Tihamah-Sooq/src/i18n/locales.test.ts) recursively verifies that 100% of keys in `ar.ts` and `en.ts` match with zero missing, extra, or empty strings.

---

## Developer Usage

### 1. `useI18n` Hook
```tsx
import { useI18n } from "../i18n/I18nContext";

function MyComponent() {
  const { locale, dir, t, formatNumber, formatMoney, formatDate } = useI18n();

  return (
    <div>
      <h2>{t.dashboard.title}</h2>
      <p>{formatMoney(1500)}</p>
      <span>{formatDate(new Date())}</span>
    </div>
  );
}
```

### 2. Isolated Test Fallback
If `useI18n()` is called outside `<I18nProvider>`, it returns a safe default Arabic fallback context instead of throwing an unhandled exception, ensuring that unit tests mount components without boilerplate wrappers.

---

## Universal CSV Export with UTF-8 BOM

For all table exports (`Listings`, `Users`, `Commissions`, `Reports`, `Audit Logs`):
- Functions in [`src/utils/exportUtils.ts`](file:///d:/dashboard/Tihamah-Sooq/src/utils/exportUtils.ts) prepend the UTF-8 Byte Order Mark (`\uFEFF`).
- This guarantees Arabic letters display cleanly when opened in Microsoft Excel (Windows & Mac) and Apple Numbers, avoiding encoding corruption.
