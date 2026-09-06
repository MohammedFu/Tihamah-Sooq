# Shared Form Infrastructure

Administrative forms use React Hook Form for state and submission locking, Zod for schema validation, and `@hookform/resolvers` to connect the two. Keep feature rules in `src/features/<feature>/schemas`; shared controls in `src/components/ui/forms` must remain domain-neutral.

## Available patterns

- `TextField`, `SelectField`, `TextareaField`, and `DateField` render explicit labels and connect hints and validation messages with `aria-describedby`.
- `ToggleField` uses a native checkbox with switch semantics; do not replace it with a click-only element.
- `FileUploadField` supplies the accessible file-input shell only. MIME, size, dimensions, upload progress, and trusted-host enforcement belong to T28.
- `ValidatedForm` disables browser-native validation so the feature schema is the single client-side validation source.
- `SubmitButton` disables itself and exposes `aria-busy` while an asynchronous submit is pending.
- `FormDialog` marks dirty state through Refine, blocks dialog dismissal during submission, asks before discarding local changes, and delegates keyboard focus containment/restoration to `Modal`.

The application mounts `UnsavedChangesNotifier`, so a dirty `FormDialog` also warns before dashboard navigation or a browser unload. Call the dialog-provided `requestClose` callback from cancel controls; calling a feature's raw close setter would bypass the dirty-state confirmation.

## Feature integration

Create a Zod schema and infer its TypeScript value type. Pass `zodResolver(schema)` to `useForm`, spread `register(...)` into the shared field, pass `formState.errors` into its `error` prop, and pass `isDirty`/`isSubmitting` to `FormDialog`. Submit through `handleSubmit` and clear or reset the form only after the mutation succeeds.

The locations editor is the first integrated reference. It intentionally still updates fixture state: remote region/village CRUD remains T22, while the form-state and accessibility contract is complete in T14.
