# Accessibility and RTL

The dashboard targets WCAG 2.1 Level A and AA for the implemented fixture-backed workflows. Arabic remains the document language and RTL is the default direction; machine-oriented values such as phone numbers, transfer references, audit codes, IP addresses, and record IDs are isolated with `dir="ltr"` or `<bdi>` so they do not reorder surrounding Arabic text.

## Keyboard and focus behavior

- A skip link is the first focusable dashboard control and moves focus to the main content.
- Route changes move focus to the new page's `h1`, making SPA navigation apparent without forcing the heading into the normal Tab order.
- The mobile sidebar is removed from keyboard navigation while off-screen. Opening it moves focus to its close control, makes the page behind it inert, supports Escape, and restores focus to the menu trigger.
- Shared modals and drawers label themselves from their visible heading, contain Tab and Shift+Tab focus, close with Escape, and restore focus to the opener.
- Filter groups expose their selected state with `aria-pressed`. The system tab list implements roving focus plus Left/Right, Home, and End keys.
- Native file inputs remain visually compact but keyboard-focusable; their surrounding upload surface displays the focus indicator.

Focus, hover, and motion behavior is centralized in `src/styles/index.css`. The reduced-motion media query removes animation/transition duration and delay. Focus uses a solid derived-amber outline, while the exact source Gold and Amber colors remain available for non-text accents.

## Automated verification

`e2e/accessibility.spec.ts` runs axe-core with WCAG 2.0/2.1 A and AA tags against login and all nine protected routes at 390 px and 1440 px. It also scans the category, banner, and location editors plus listing, user, commission, and report drawers. Focus behavior is exercised with real keyboard input, and every route is checked at 320 CSS pixels—the reflow equivalent of 200% zoom on a 640 CSS-pixel viewport—for document-level horizontal overflow.

Run the focused suite with:

```powershell
npm run test:a11y
```

Automated scans cannot prove usability. When changing navigation, dialogs, tables, form validation, or media, also verify logical reading order, visible focus, meaningful alternative text, and task completion with keyboard alone in a real browser. Screen-reader announcements and media descriptions should be manually sampled before a production release.
