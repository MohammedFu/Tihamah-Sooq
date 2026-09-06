# Shared Administrative Data Table

`src/components/ui/DataTable` is the single rendering boundary for dashboard tables. Feature modules own their column definitions and record actions; the shared component owns table semantics, loading/error/empty states, sorting controls, pagination, and responsive containment.

## Component contract

`DataTable<TRecord>` requires:

- an accessible `caption`;
- typed `columns`, each with a stable ID, Arabic header, and record cell renderer;
- current-page `rows` and a stable `rowKey`;
- an empty-state message appropriate to the feature.

Optional controlled inputs provide:

- `loading`, which renders five non-interactive skeleton rows and a screen-reader status;
- `error`, `onRetry`, and `retrying`, which retain the table surface and expose a guarded recovery action;
- `sort` and `onSortChange`, which cycle sortable headers through ascending, descending, and unset while maintaining `aria-sort`;
- `pagination`, `onPageChange`, and `onPageSizeChange`, which display the returned total and never navigate before page 1 or beyond the last page;
- `toolbar`, where feature search and filters remain readable rather than being hidden inside generic configuration.

All icon-only row actions must provide both `aria-label` and `title`. Columns use `scope="col"`, and machine-oriented values retain local `dir="ltr"` or `bdi` isolation.

## URL state

`useDataTableUrlState` maps table state to stable query parameters:

| State | Parameter |
| --- | --- |
| Page | `page` |
| Page size | `limit` |
| Search | `q` |
| Feature filter | Its configured parameter, such as `status` |
| Sort field | `sort` |
| Sort direction | `order=asc|desc` |

Invalid pages, page sizes, filter values, sort fields, and directions fall back safely. Defaults are omitted from the URL. Search, filter, page-size, and sort changes reset `page`, while direct page navigation preserves other query parameters. Current fixture-backed pages clamp an out-of-range restored page after filtering or mutation.

## Backend boundary

Swagger confirms `page` and `limit` for users, commissions, and reports. It confirms `q` and `is_banned` for users, and `status` for commissions and reports. It does not confirm server sorting for those resources, so their current feature columns do not expose sorting controls. Listing sorting is retained only in the fixture-backed review screen pending confirmation of the listing administration contract in T18.

Catalog collections remain complete, unpaginated responses per T05; the data provider derives their local sorting/pagination. The table component is controlled and does not make requests itself, so T17–T25 can connect Refine/server results without replacing presentation or URL behavior.

## Responsive behavior

- Above 700 px, the semantic table retains its intrinsic width and scrolls only inside `.table-wrap` when needed.
- At 700 px and below, each row becomes a scan-friendly record card. Every cell exposes its column title through `data-label`; the header remains available to assistive technology.
- The document must never gain horizontal overflow from a table.
- Browser coverage exercises 390, 768, and 1440 px layouts.
