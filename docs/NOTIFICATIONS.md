# Dashboard Notifications

The dashboard has one notification queue for feature feedback and Refine mutations. `NotificationViewport` is mounted once beside the application routes, while `adminNotificationProvider` connects Refine's success, error, and progress events to the same queue.

The Notebook's “Push Broadcast & Audit Logs” workflow sends FCM messages to marketplace users. That business operation is separate from these administrator-facing feedback notifications and remains part of T25; T15 does not change its remote contract or claim delivery before the broadcast service responds.

## Types and lifetime

- `success`, `error`, `warning`, and `info` notifications dismiss after severity-specific defaults and always retain an explicit close control.
- `progress` notifications are persistent. Reuse their key when replacing them with the final success or error state.
- `trackPromise` opens progress immediately and emits success only after the supplied promise resolves. Use it for financial and other high-risk remote mutations so the interface cannot claim completion early.
- An explicit `durationMs: null` makes any notification persistent.

Feature code should call `useAdminNotification()` and choose the type that matches the outcome. Messages must identify the completed action and affected record where useful. Do not add automatic retry globally. An error may receive an action only when the caller knows the operation is safe to repeat; destructive and financial mutations require a refreshed review unless the backend contract confirms idempotency.

The viewport stacks messages above page controls, collapses to mobile-safe insets, and leaves pointer interaction enabled only on each toast. Errors and warnings use assertive `alert` semantics; progress, information, and success use polite `status` announcements. Toast timers belong to the toast component and are cleared whenever it updates or unmounts.
