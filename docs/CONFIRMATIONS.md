# Standardized High-Risk Confirmations

Administrative operations with destructive, financial, or access-control effects require standardized confirmation to prevent accidental invocation, rapid-click duplicate requests, and untracked actions. The shared control is implemented in `src/components/ui/ConfirmDialog.tsx`.

## Core Invariants

1. **Escape and Cancel Never Submit**:
   - Dismissing the dialog through the Escape key, clicking the backdrop, or clicking the secondary Cancel button closes the dialog without triggering any remote mutation.
2. **Rapid-Click and Double-Submit Guard**:
   - The dialog maintains an internal submission lock (`isBusy`). While an asynchronous action is pending, repeated clicks are dropped, the confirm button exposes `aria-busy="true"`, and the Cancel control and Escape key are disabled.
3. **Intent-Specific Visual Hierarchy**:
   - `danger`: High-risk or irreversible destructive operations (e.g. deleting listings, deleting categories, deleting villages/regions). Distinct red indicator with accessible secondary button auto-focused by default to prevent accidental `Enter` execution.
   - `warning`: Impactful non-destructive actions or dependency blocks (e.g. blocked region deletion due to child villages).
   - `success`: Financial approval or access restoration (e.g. verifying commission payment, unbanning an account).
   - `info`: System settings updates or broadcast dispatches.
4. **Attributable Rationale & Mandatory Reasons**:
   - When configured with `reasonConfig`, the dialog requires a non-empty, minimum-length rationale before submission is permitted, passing the reason string directly to `onConfirm(reason)`.
5. **Typed Confirmation Matches**:
   - For sensitive irreversible operations, `confirmTextMatch` disables the submit action until the administrator types the exact expected keyword.
6. **Refine Permissions Integration**:
   - By specifying `resource` and `action`, the confirm action integrates with `AuthorizedButton`, ensuring actions are hidden or disabled when the administrator lacks sufficient RBAC privileges.
