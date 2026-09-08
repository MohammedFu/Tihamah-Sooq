import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../http";
import { ApiError } from "../http";
import {
  assertTrustedMediaUrl,
  createMediaService,
  createXhrPutUploadTransport,
  validateMediaFile,
  type MediaMetadataProbe,
  type MediaUploadTransport,
} from "./media";

const imageMetadata = { width: 1200, height: 630, durationSeconds: null } as const;
const imageProbe = vi.fn<MediaMetadataProbe>().mockResolvedValue(imageMetadata);

function signature(type: string) {
  if (type === "image/jpeg") return new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  if (type === "image/png") return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === "image/webp") return new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  if (type === "video/quicktime") return new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]);
  if (type === "video/mp4") return new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  return new Uint8Array([0]);
}

function file(name = "banner.webp", type = "image/webp", bytes = 128) {
  const header = signature(type);
  return new File(bytes === 0 ? [] : [header, new Uint8Array(Math.max(0, bytes - header.length))], name, { type });
}

function setup(options: {
  response?: unknown;
  probe?: MediaMetadataProbe;
  transport?: MediaUploadTransport;
  mediaHost?: string | null;
} = {}) {
  const post = vi.fn().mockResolvedValue(options.response ?? {
    success: true,
    upload_url: "https://storage.example.test/object.webp?signature=secret",
    media_url: "https://cdn.example.test/media/object.webp",
  });
  const transport = options.transport ?? { upload: vi.fn().mockResolvedValue(undefined) };
  const service = createMediaService({
    client: { post } as unknown as Pick<ApiClient, "post">,
    mediaHost: options.mediaHost === undefined ? "https://cdn.example.test/media" : options.mediaHost,
    metadataProbe: options.probe ?? imageProbe,
    uploadTransport: transport,
  });
  return { post, service, transport };
}

describe("secure media service", () => {
  it("validates before presigning, uploads directly, and returns only the trusted public URL", async () => {
    const progress: number[] = [];
    const transport = { upload: vi.fn(async ({ onProgress }: Parameters<MediaUploadTransport["upload"]>[0]) => { onProgress?.(47); }) };
    const { post, service } = setup({ transport });
    const source = file();

    const result = await service.upload(source, { allowedKinds: ["image"], onProgress: (value) => progress.push(value) });

    expect(post).toHaveBeenCalledWith("media/presign", { filename: "banner.webp", media_type: "image" }, { signal: undefined });
    expect(transport.upload).toHaveBeenCalledWith(expect.objectContaining({
      uploadUrl: "https://storage.example.test/object.webp?signature=secret",
      file: source,
    }));
    expect(result).toEqual({
      publicUrl: "https://cdn.example.test/media/object.webp",
      kind: "image",
      filename: "banner.webp",
      sizeBytes: 128,
      width: 1200,
      height: 630,
      durationSeconds: null,
    });
    expect(JSON.stringify(result)).not.toContain("signature=secret");
    expect(progress).toEqual([0, 47, 100]);
  });

  it("rejects unsupported MIME, mismatched extensions/content, empty files, and oversized files before metadata or I/O", async () => {
    const probe = vi.fn<MediaMetadataProbe>();
    const { post, service, transport } = setup({ probe });
    const invalidFiles = [
      file("payload.svg", "image/svg+xml"),
      file("banner.png", "image/jpeg"),
      file("empty.webp", "image/webp", 0),
      file("large.webp", "image/webp", (5 * 1024 * 1024) + 1),
      file("../banner.webp", "image/webp"),
      new File([signature("image/png")], "disguised.webp", { type: "image/webp" }),
    ];

    for (const invalid of invalidFiles) await expect(service.upload(invalid)).rejects.toBeInstanceOf(ApiError);

    expect(probe).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(transport.upload).not.toHaveBeenCalled();
  });

  it("enforces image dimensions and the documented 30-second video limit", async () => {
    await expect(validateMediaFile(file(), {
      allowedKinds: ["image"],
      policies: { image: { maxBytes: 5 * 1024 * 1024, mimeExtensions: { "image/webp": ["webp"] }, minWidth: 1600 } },
    }, vi.fn<MediaMetadataProbe>().mockResolvedValue(imageMetadata))).rejects.toMatchObject({ code: "MEDIA_DIMENSIONS_TOO_SMALL" });

    const video = file("clip.mp4", "video/mp4");
    await expect(validateMediaFile(video, { allowedKinds: ["video"] }, vi.fn<MediaMetadataProbe>().mockResolvedValue({
      width: 1920,
      height: 1080,
      durationSeconds: 30.01,
    }))).rejects.toMatchObject({ code: "VIDEO_TOO_LONG" });
  });

  it("rejects public URLs outside the configured origin/path and unsafe presigned URLs", async () => {
    expect(() => assertTrustedMediaUrl("https://cdn.example.test/media/banner.webp", "https://cdn.example.test/media")).not.toThrow();
    expect(() => assertTrustedMediaUrl("https://cdn.example.test/media-other/banner.webp", "https://cdn.example.test/media")).toThrowError(ApiError);
    expect(() => assertTrustedMediaUrl("https://evil.example.test/media/banner.webp", "https://cdn.example.test/media")).toThrowError(ApiError);
    expect(() => assertTrustedMediaUrl("https://cdn.example.test/media/banner.webp?signature=secret", "https://cdn.example.test/media")).toThrowError(ApiError);
    expect(() => assertTrustedMediaUrl("https://cdn.example.test/media/banner.webp", null)).toThrowError(ApiError);

    const untrusted = setup({ response: { success: true, upload_url: "https://storage.example.test/file", media_url: "https://evil.example.test/file" } });
    await expect(untrusted.service.upload(file())).rejects.toMatchObject({ code: "UNTRUSTED_MEDIA_HOST" });
    expect(untrusted.transport.upload).not.toHaveBeenCalled();

    const unsafe = setup({ response: { success: true, upload_url: "http://storage.example.test/file", media_url: "https://cdn.example.test/media/file" } });
    await expect(unsafe.service.upload(file())).rejects.toMatchObject({ code: "UNSAFE_MEDIA_UPLOAD_URL" });
    expect(unsafe.transport.upload).not.toHaveBeenCalled();
  });

  it("does not return a stale public URL when cancellation wins the upload race", async () => {
    let finishUpload!: () => void;
    const transport = { upload: vi.fn(() => new Promise<void>((resolve) => { finishUpload = resolve; })) };
    const { service } = setup({ transport });
    const controller = new AbortController();
    const pending = service.upload(file(), { signal: controller.signal });

    await vi.waitFor(() => expect(transport.upload).toHaveBeenCalled());
    controller.abort();
    finishUpload();

    await expect(pending).rejects.toMatchObject({ kind: "aborted", code: "MEDIA_UPLOAD_ABORTED" });
  });

  it("uses an isolated PUT transport with content type, progress, and no authorization header", async () => {
    class FakeXhr {
      upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
      status = 204;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onabort: (() => void) | null = null;
      open = vi.fn();
      setRequestHeader = vi.fn();
      abort = vi.fn(() => this.onabort?.());
      send = vi.fn(() => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);
        this.onload?.();
      });
    }
    const xhr = new FakeXhr();
    const progress: number[] = [];
    const transport = createXhrPutUploadTransport(() => xhr as unknown as XMLHttpRequest);

    await transport.upload({ uploadUrl: "https://storage.example.test/file?secret=value", file: file(), onProgress: (value) => progress.push(value) });

    expect(xhr.open).toHaveBeenCalledWith("PUT", "https://storage.example.test/file?secret=value", true);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith("Content-Type", "image/webp");
    expect(xhr.setRequestHeader).not.toHaveBeenCalledWith("Authorization", expect.anything());
    expect(progress).toEqual([50]);
  });
});
