# Tihamah-Sooq Dashboard Design System

The visual source of truth is the one-page mobile library at `D:\dashboard\Notebook\design-system.pdf`. The dashboard extends that library to desktop administration without modifying the PDF or the Notebook folder.

## Foundation

- Typography: self-hosted **Tajawal** in weights 400, 500, 700, and 800. Arabic and Latin text both use Tajawal; Arial is only a last-resort fallback.
- Source palette: Rural BG `#F9FAFB`, Rural Gold `#F59E0B`, Rural Amber `#D97706`, Rural Green `#2D6A4F`, and Rural Dark `#1B4332`.
- Rural Gold and Rural Amber remain the source accent colors for decorative highlights. Interactive text, primary-action fills, and focus indicators use a darker derived amber so small Arabic labels and white button text meet WCAG AA contrast. Navigation, identity, secondary actions, headings, and informational states use Rural Green/Dark.
- Status colors retain accessible danger and warning semantics. Their backgrounds are deliberately pale so status never depends on color intensity alone.
- The interface remains RTL. IDs, request references, phone numbers, and other machine-oriented values opt into LTR with `dir`/`bdi` at component level.

All reusable values live in `src/styles/tokens.css`. Component CSS must consume semantic variables rather than introduce literal colors. Dark mode is intentionally out of scope.

## Components

The PDF supplies buttons, icon controls, inputs, selects, cards/media, chips, list rows, navigation rows, feedback, and dialog examples. The dashboard applies those patterns to its additional administrative surfaces:

- sidebar and topbar navigation;
- server filters, tabs, data tables, pagination-ready toolbars, and empty states;
- KPI cards and operational queues;
- drawers and modal confirmations;
- status badges, audit metadata, notices, and authentication/error states.

Desktop components use the same palette, Tajawal type hierarchy, rounded controls, quiet borders, and restrained elevation. Cards use the shared 12 px PDF-derived radius; nested controls use 6–10 px radii. Focus uses a clearly visible derived-amber ring, keyboard interactions never rely on hover, and reduced-motion preferences disable nonessential transitions and animations.

## Contribution rules

1. Reuse a semantic token before adding a new one.
2. Add new literal colors only to `tokens.css`, document their semantic purpose, and verify contrast.
3. Use `.button`, `.icon-button`, shared fields, `.card`, `.badge`, modal/drawer, and state patterns before creating a feature-local variant.
4. Verify changes at 390 px and 1440 px, in RTL, on all affected routes.
5. Keep mobile tables inside `.table-wrap`; the document itself must not scroll horizontally.
