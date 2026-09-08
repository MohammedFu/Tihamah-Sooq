# Secure media uploads

T28 introduces a shared, feature-neutral media boundary in `src/services/admin/media.ts` and `src/components/ui/forms/MediaUpload.tsx`. It is intentionally not wired into banners while T24 is being developed separately.

## Confirmed contract

The reviewed Swagger and Postman collection confirm these authenticated media endpoints:

| Operation | Contract |
| --- | --- |
| Request a presigned URL | `POST /api/v1/media/presign` with `{ "filename": string, "media_type": "image" | "video" }` |
| Presign response | Top-level `{ success, message, upload_url, media_url }` |
| Multipart fallback | `POST /api/v1/media/upload`, `multipart/form-data`, field name `file` |

The presign route is preferred because the file is uploaded directly to object storage rather than passing a large payload through the API server. The dashboard submits only the final `media_url`; the signed `upload_url` is confined to the transport and is never returned to forms, notifications, storage, or logs.

Two production details are still unconfirmed. The documents mark the route with generic Bearer security but the Postman example uses `client_token`, so acceptance of an administrator token must be verified. They also do not state the object-storage request method or signed headers. `createXhrPutUploadTransport` isolates the conventional S3 `PUT` behavior so it can be replaced without changing validation or UI code. Remote feature wiring must remain disabled until both details are confirmed.

## Validation policy

Validation occurs before the presign request:

- images: JPEG (`.jpg`/`.jpeg`), PNG, or WEBP, up to 5 MiB;
- video: MP4 or QuickTime/MOV, up to 15 MiB and 30 seconds;
- browser MIME, filename extension, and JPEG/PNG/WEBP/ISO-BMFF file signature must agree;
- files must be non-empty and have safe filenames;
- browser-decoded width, height, and video duration must be finite and positive;
- default decompression safety limits are 8192 px per dimension and 40 million pixels;
- feature-specific policies can impose tighter dimensions, such as a banner aspect ratio or minimum category-icon size.

MIME and client metadata checks are defense in depth, not a replacement for server-side content inspection, malware scanning, image re-encoding, storage quotas, or authorization.

## URL trust boundary

`VITE_MEDIA_HOST` identifies the permitted HTTPS origin and optional base path for final public URLs. Uploads fail with a configuration error when it is absent. Returned public URLs must:

- use HTTPS;
- match the configured origin and path boundary exactly;
- contain no credentials, fragment, or query string.

The presigned storage URL may contain its required signature query, but must use HTTPS and contain no credentials or fragment. Authorization headers are never copied to object storage.

## Component lifecycle

`MediaUpload` is controlled by the final public URL. Selecting or retrying a file clears the current value before work begins, exposes validation/upload progress, and disables replacement while active. Cancel aborts the request and invalidates the operation generation; even a transport that resolves late cannot restore its stale URL. Failed and cancelled attempts retain the local `File` for an explicit retry. Removing a completed file clears the controlled value.

Consumers should disable their enclosing save action while `onStatusChange` reports `validating` or `uploading`. They should pass feature-specific `allowedKinds` and policy overrides, and persist only the value emitted by `onChange` after success.

## Verification

Unit tests cover preflight rejection before I/O, MIME/extension pairing, size, dimensions, video duration, exact presign payloads, trusted-host enforcement, signed-URL containment, PUT headers/progress, and cancellation races. React Testing Library covers accessible selection, successful final-URL emission, retry, and late completion after cancellation. Tests use injected probes/transports and perform no external uploads.
