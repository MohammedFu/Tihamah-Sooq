import type { ApiClient } from "../http";
import { ApiError, isApiError } from "../http";

export type MediaKind = "image" | "video";

export type MediaMetadata = Readonly<{
  width: number;
  height: number;
  durationSeconds: number | null;
}>;

export type MediaPolicy = Readonly<{
  maxBytes: number;
  mimeExtensions: Readonly<Record<string, readonly string[]>>;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxPixels?: number;
  maxDurationSeconds?: number;
}>;

export type MediaValidationOptions = Readonly<{
  allowedKinds?: readonly MediaKind[];
  policies?: Partial<Readonly<Record<MediaKind, MediaPolicy>>>;
  signal?: AbortSignal;
}>;

export type ValidatedMediaFile = Readonly<{
  file: File;
  kind: MediaKind;
  metadata: MediaMetadata;
}>;

export type UploadedMedia = Readonly<{
  publicUrl: string;
  kind: MediaKind;
  filename: string;
  sizeBytes: number;
  width: number;
  height: number;
  durationSeconds: number | null;
}>;

export type MediaMetadataProbe = (
  file: File,
  kind: MediaKind,
  signal?: AbortSignal,
) => Promise<MediaMetadata>;

export type UploadTransportInput = Readonly<{
  uploadUrl: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (percentage: number) => void;
}>;

export interface MediaUploadTransport {
  upload(input: UploadTransportInput): Promise<void>;
}

export interface MediaService {
  validate(file: File, options?: MediaValidationOptions): Promise<ValidatedMediaFile>;
  upload(
    file: File,
    options?: MediaValidationOptions & Readonly<{ onProgress?: (percentage: number) => void }>,
  ): Promise<UploadedMedia>;
}

const MEBIBYTE = 1024 * 1024;

export const DEFAULT_MEDIA_POLICIES: Readonly<Record<MediaKind, MediaPolicy>> = Object.freeze({
  image: Object.freeze({
    maxBytes: 5 * MEBIBYTE,
    mimeExtensions: Object.freeze({
      "image/jpeg": Object.freeze(["jpg", "jpeg"]),
      "image/png": Object.freeze(["png"]),
      "image/webp": Object.freeze(["webp"]),
    }),
    minWidth: 1,
    minHeight: 1,
    maxWidth: 8192,
    maxHeight: 8192,
    maxPixels: 40_000_000,
  }),
  video: Object.freeze({
    maxBytes: 15 * MEBIBYTE,
    mimeExtensions: Object.freeze({
      "video/mp4": Object.freeze(["mp4"]),
      "video/quicktime": Object.freeze(["mov"]),
    }),
    minWidth: 1,
    minHeight: 1,
    maxWidth: 8192,
    maxHeight: 8192,
    maxPixels: 40_000_000,
    maxDurationSeconds: 30,
  }),
});

export const DEFAULT_MEDIA_ACCEPT = Object.values(DEFAULT_MEDIA_POLICIES)
  .flatMap((policy) => Object.keys(policy.mimeExtensions))
  .join(",");

function mediaError(code: string, userMessage: string, retryable = false, cause?: unknown) {
  return new ApiError({ kind: "validation", code, userMessage, retryable, cause });
}

function abortedError(cause?: unknown) {
  return new ApiError({
    kind: "aborted",
    code: "MEDIA_UPLOAD_ABORTED",
    userMessage: "تم إلغاء رفع الملف.",
    retryable: false,
    cause,
  });
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortedError(signal.reason);
}

function fileExtension(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot + 1).toLocaleLowerCase("en-US");
}

function validateFilename(filename: string) {
  if (!filename || filename.length > 255 || /[\\/\u0000-\u001f\u007f]/.test(filename)) {
    throw mediaError("INVALID_MEDIA_FILENAME", "اسم الملف غير صالح للرفع.");
  }
}

function identifyKind(file: File, allowedKinds: readonly MediaKind[], policies: Readonly<Record<MediaKind, MediaPolicy>>) {
  const mime = file.type.trim().toLocaleLowerCase("en-US");
  const extension = fileExtension(file.name);
  const kind = allowedKinds.find((candidate) => Object.prototype.hasOwnProperty.call(policies[candidate].mimeExtensions, mime));

  if (!kind) {
    throw mediaError("UNSUPPORTED_MEDIA_TYPE", "نوع الملف غير مدعوم. استخدم JPG أو PNG أو WEBP للصور، وMP4 أو MOV للفيديو.");
  }
  if (!policies[kind].mimeExtensions[mime]?.includes(extension)) {
    throw mediaError("MEDIA_EXTENSION_MISMATCH", "امتداد الملف لا يطابق نوع المحتوى الفعلي.");
  }
  return kind;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

async function sniffMediaMime(file: File, signal?: AbortSignal) {
  throwIfAborted(signal);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch (cause) {
    if (signal?.aborted) throw abortedError(cause);
    throw mediaError("UNREADABLE_MEDIA_SIGNATURE", "تعذر التحقق من محتوى الملف.", false, cause);
  }
  throwIfAborted(signal);
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 4) === "ftyp") return ascii(bytes, 8, 4) === "qt  " ? "video/quicktime" : "video/mp4";
  return null;
}

function assertFiniteDimension(value: number, code: string) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw mediaError(code, "تعذر قراءة أبعاد ملف الوسائط بصورة موثوقة.");
  }
}

function validateMetadata(kind: MediaKind, metadata: MediaMetadata, policy: MediaPolicy) {
  assertFiniteDimension(metadata.width, "INVALID_MEDIA_WIDTH");
  assertFiniteDimension(metadata.height, "INVALID_MEDIA_HEIGHT");

  if ((policy.minWidth !== undefined && metadata.width < policy.minWidth)
    || (policy.minHeight !== undefined && metadata.height < policy.minHeight)) {
    throw mediaError("MEDIA_DIMENSIONS_TOO_SMALL", "أبعاد الملف أصغر من الحد المطلوب.");
  }
  if ((policy.maxWidth !== undefined && metadata.width > policy.maxWidth)
    || (policy.maxHeight !== undefined && metadata.height > policy.maxHeight)
    || (policy.maxPixels !== undefined && metadata.width * metadata.height > policy.maxPixels)) {
    throw mediaError("MEDIA_DIMENSIONS_TOO_LARGE", "أبعاد الملف أكبر من الحد الآمن للرفع.");
  }

  if (kind === "image") {
    if (metadata.durationSeconds !== null) {
      throw mediaError("INVALID_IMAGE_METADATA", "بيانات ملف الصورة غير صالحة.");
    }
    return;
  }

  if (metadata.durationSeconds === null || !Number.isFinite(metadata.durationSeconds) || metadata.durationSeconds <= 0) {
    throw mediaError("INVALID_VIDEO_DURATION", "تعذر قراءة مدة ملف الفيديو بصورة موثوقة.");
  }
  if (policy.maxDurationSeconds !== undefined && metadata.durationSeconds > policy.maxDurationSeconds) {
    throw mediaError("VIDEO_TOO_LONG", `يجب ألا تتجاوز مدة الفيديو ${policy.maxDurationSeconds} ثانية.`);
  }
}

function probeElement(
  file: File,
  signal: AbortSignal | undefined,
  element: HTMLImageElement | HTMLVideoElement,
  read: () => MediaMetadata,
) {
  return new Promise<MediaMetadata>((resolve, reject) => {
    throwIfAborted(signal);
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      element.onload = null;
      element.onerror = null;
      if (element instanceof HTMLVideoElement) element.onloadedmetadata = null;
      URL.revokeObjectURL(objectUrl);
      callback();
    };
    const abort = () => finish(() => reject(abortedError(signal?.reason)));
    const fail = () => finish(() => reject(mediaError("UNREADABLE_MEDIA_METADATA", "تعذر قراءة بيانات ملف الوسائط.")));
    const success = () => finish(() => {
      try {
        resolve(read());
      } catch (error) {
        reject(isApiError(error) ? error : mediaError("UNREADABLE_MEDIA_METADATA", "تعذر قراءة بيانات ملف الوسائط.", false, error));
      }
    });

    signal?.addEventListener("abort", abort, { once: true });
    element.onerror = fail;
    if (element instanceof HTMLVideoElement) {
      element.onloadedmetadata = success;
      element.preload = "metadata";
    } else {
      element.onload = success;
    }
    element.src = objectUrl;
  });
}

export const browserMediaMetadataProbe: MediaMetadataProbe = (file, kind, signal) => {
  if (kind === "image") {
    const image = new Image();
    return probeElement(file, signal, image, () => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
      durationSeconds: null,
    }));
  }

  const video = document.createElement("video");
  return probeElement(file, signal, video, () => ({
    width: video.videoWidth,
    height: video.videoHeight,
    durationSeconds: video.duration,
  }));
};

export async function validateMediaFile(
  file: File,
  options: MediaValidationOptions = {},
  probe: MediaMetadataProbe = browserMediaMetadataProbe,
): Promise<ValidatedMediaFile> {
  throwIfAborted(options.signal);
  validateFilename(file.name);
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw mediaError("EMPTY_MEDIA_FILE", "الملف فارغ ولا يمكن رفعه.");
  }

  const policies = { ...DEFAULT_MEDIA_POLICIES, ...options.policies };
  const allowedKinds = options.allowedKinds ?? (["image", "video"] as const);
  if (allowedKinds.length === 0) throw mediaError("EMPTY_MEDIA_POLICY", "لا توجد أنواع وسائط مسموح بها لهذا الحقل.");
  const kind = identifyKind(file, allowedKinds, policies);
  const policy = policies[kind];
  if (file.size > policy.maxBytes) {
    const megabytes = Math.floor(policy.maxBytes / MEBIBYTE);
    throw mediaError("MEDIA_FILE_TOO_LARGE", `يجب ألا يتجاوز حجم الملف ${megabytes} ميجابايت.`);
  }

  const detectedMime = await sniffMediaMime(file, options.signal);
  if (detectedMime !== file.type.trim().toLocaleLowerCase("en-US")) {
    throw mediaError("MEDIA_CONTENT_MISMATCH", "محتوى الملف لا يطابق نوعه وامتداده.");
  }

  const metadata = await probe(file, kind, options.signal);
  throwIfAborted(options.signal);
  validateMetadata(kind, metadata, policy);
  return { file, kind, metadata };
}

function parseAbsoluteUrl(value: unknown, purpose: "upload" | "public") {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError({ kind: "invalid_response", code: "INVALID_MEDIA_URL", userMessage: "استجاب الخادم برابط وسائط غير صالح." });
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new ApiError({ kind: "invalid_response", code: "INVALID_MEDIA_URL", userMessage: "استجاب الخادم برابط وسائط غير صالح.", cause });
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || (purpose === "public" && url.search)) {
    throw new ApiError({ kind: "invalid_response", code: `UNSAFE_MEDIA_${purpose.toLocaleUpperCase("en-US")}_URL`, userMessage: "رفض التطبيق رابط وسائط غير آمن من الخادم." });
  }
  return url;
}

export function assertTrustedMediaUrl(value: unknown, mediaHost: string | null) {
  if (!mediaHost) {
    throw new ApiError({
      kind: "configuration",
      code: "MEDIA_HOST_NOT_CONFIGURED",
      userMessage: "رفع الوسائط غير متاح حتى يتم إعداد نطاق الوسائط الموثوق.",
    });
  }

  const mediaUrl = parseAbsoluteUrl(value, "public");
  let trusted: URL;
  try {
    trusted = new URL(mediaHost);
  } catch (cause) {
    throw new ApiError({ kind: "configuration", code: "INVALID_MEDIA_HOST", userMessage: "إعداد نطاق الوسائط غير صالح.", cause });
  }
  if (trusted.protocol !== "https:" || trusted.username || trusted.password || trusted.search || trusted.hash) {
    throw new ApiError({ kind: "configuration", code: "INVALID_MEDIA_HOST", userMessage: "إعداد نطاق الوسائط غير صالح." });
  }
  const trustedPath = trusted.pathname === "/" ? "/" : trusted.pathname.replace(/\/+$/, "");
  const pathMatches = trustedPath === "/"
    || mediaUrl.pathname === trustedPath
    || mediaUrl.pathname.startsWith(`${trustedPath}/`);
  if (mediaUrl.origin !== trusted.origin || !pathMatches) {
    throw new ApiError({ kind: "invalid_response", code: "UNTRUSTED_MEDIA_HOST", userMessage: "رفض التطبيق رابط وسائط من نطاق غير موثوق." });
  }
  return mediaUrl.toString();
}

export function createXhrPutUploadTransport(
  xhrFactory: () => XMLHttpRequest = () => new XMLHttpRequest(),
): MediaUploadTransport {
  return {
    upload({ uploadUrl, file, signal, onProgress }) {
      return new Promise<void>((resolve, reject) => {
        throwIfAborted(signal);
        const xhr = xhrFactory();
        let settled = false;
        const cleanup = () => signal?.removeEventListener("abort", abort);
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          cleanup();
          callback();
        };
        const abort = () => {
          xhr.abort();
          finish(() => reject(abortedError(signal?.reason)));
        };

        signal?.addEventListener("abort", abort, { once: true });
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            onProgress?.(Math.min(99, Math.max(0, Math.round((event.loaded / event.total) * 100))));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) finish(resolve);
          else finish(() => reject(new ApiError({
            kind: "http",
            code: `MEDIA_UPLOAD_HTTP_${xhr.status}`,
            status: xhr.status,
            userMessage: "رفض مخزن الوسائط رفع الملف.",
            retryable: xhr.status >= 500 || xhr.status === 0,
          })));
        };
        xhr.onerror = () => finish(() => reject(new ApiError({
          kind: "network",
          code: "MEDIA_UPLOAD_NETWORK_ERROR",
          userMessage: "تعذر الاتصال بمخزن الوسائط. حاول مرة أخرى.",
          retryable: true,
        })));
        xhr.onabort = () => finish(() => reject(abortedError()));
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    },
  };
}

type PresignResponse = Readonly<{
  success?: unknown;
  upload_url?: unknown;
  media_url?: unknown;
}>;

function mapPresignResponse(value: unknown, mediaHost: string | null) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError({ kind: "invalid_response", code: "INVALID_PRESIGN_RESPONSE", userMessage: "استجاب الخادم ببيانات رفع غير صالحة." });
  }
  const response = value as PresignResponse;
  if (response.success !== true) {
    throw new ApiError({ kind: "invalid_response", code: "INVALID_PRESIGN_RESPONSE", userMessage: "لم يؤكد الخادم إنشاء رابط الرفع." });
  }
  const uploadUrl = parseAbsoluteUrl(response.upload_url, "upload").toString();
  const publicUrl = assertTrustedMediaUrl(response.media_url, mediaHost);
  return { uploadUrl, publicUrl };
}

export function createMediaService(options: Readonly<{
  client: Pick<ApiClient, "post">;
  mediaHost: string | null;
  metadataProbe?: MediaMetadataProbe;
  uploadTransport?: MediaUploadTransport;
}>): MediaService {
  const metadataProbe = options.metadataProbe ?? browserMediaMetadataProbe;
  const uploadTransport = options.uploadTransport ?? createXhrPutUploadTransport();

  return {
    validate: (file, validationOptions) => validateMediaFile(file, validationOptions, metadataProbe),
    async upload(file, uploadOptions = {}) {
      try {
        const validated = await validateMediaFile(file, uploadOptions, metadataProbe);
        throwIfAborted(uploadOptions.signal);
        const response = await options.client.post<unknown, { filename: string; media_type: MediaKind }>(
          "media/presign",
          { filename: validated.file.name, media_type: validated.kind },
          { signal: uploadOptions.signal },
        );
        const urls = mapPresignResponse(response, options.mediaHost);
        throwIfAborted(uploadOptions.signal);
        uploadOptions.onProgress?.(0);
        await uploadTransport.upload({
          uploadUrl: urls.uploadUrl,
          file: validated.file,
          signal: uploadOptions.signal,
          onProgress: uploadOptions.onProgress,
        });
        throwIfAborted(uploadOptions.signal);
        uploadOptions.onProgress?.(100);
        return {
          publicUrl: urls.publicUrl,
          kind: validated.kind,
          filename: validated.file.name,
          sizeBytes: validated.file.size,
          width: validated.metadata.width,
          height: validated.metadata.height,
          durationSeconds: validated.metadata.durationSeconds,
        };
      } catch (error) {
        if (uploadOptions.signal?.aborted && (!isApiError(error) || error.kind !== "aborted")) {
          throw abortedError(error);
        }
        throw error;
      }
    },
  };
}
