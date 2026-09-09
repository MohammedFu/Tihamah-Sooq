import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../services/http";
import type { MediaService, UploadedMedia } from "../../../services/admin/media";
import { MediaUpload } from "./MediaUpload";

const uploaded: UploadedMedia = {
  publicUrl: "https://cdn.example.test/media/banner.webp",
  kind: "image",
  filename: "banner.webp",
  sizeBytes: 128,
  width: 1200,
  height: 630,
  durationSeconds: null,
};

function Harness({ service, onValue = () => undefined }: { service: MediaService; onValue?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <>
    <MediaUpload
      label="JPG أو PNG أو WEBP"
      title="رفع صورة البنر"
      hint="الحد الأقصى 5 ميجابايت"
      value={value}
      onChange={(next) => { setValue(next); onValue(next); }}
      service={service}
      allowedKinds={["image"]}
    />
    <output aria-label="الرابط النهائي">{value}</output>
  </>;
}

function serviceWith(upload: MediaService["upload"]): MediaService {
  return { upload, validate: vi.fn() };
}

describe("MediaUpload", () => {
  it("emits only the final public URL after a successful upload", async () => {
    const onValue = vi.fn();
    const upload = vi.fn<MediaService["upload"]>(async (_file, options) => {
      options?.onProgress?.(35);
      options?.onProgress?.(88);
      return uploaded;
    });
    const user = userEvent.setup();
    render(<Harness service={serviceWith(upload)} onValue={onValue} />);

    const input = screen.getByLabelText("رفع صورة البنر");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    await user.upload(input, new File([new Uint8Array(128)], "banner.webp", { type: "image/webp" }));

    expect(await screen.findByLabelText("اكتمل الرفع")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "الرابط النهائي" })).toHaveTextContent(uploaded.publicUrl);
    expect(onValue.mock.calls.map(([value]) => value)).toEqual(["", uploaded.publicUrl]);
    expect(JSON.stringify(onValue.mock.calls)).not.toContain("storage.example");
  });

  it("retains the selected file and retries after a retryable failure", async () => {
    const upload = vi.fn<MediaService["upload"]>()
      .mockRejectedValueOnce(new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بمخزن الوسائط.", retryable: true }))
      .mockResolvedValueOnce(uploaded);
    const user = userEvent.setup();
    render(<Harness service={serviceWith(upload)} />);

    await user.upload(screen.getByLabelText("رفع صورة البنر"), new File(["image"], "banner.webp", { type: "image/webp" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر الاتصال بمخزن الوسائط.");
    expect(screen.getByText("banner.webp")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "إعادة محاولة الرفع" }));
    expect(await screen.findByLabelText("اكتمل الرفع")).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("cancels in flight and ignores a late stale completion", async () => {
    let resolve!: (value: UploadedMedia) => void;
    const upload = vi.fn<MediaService["upload"]>().mockImplementation((_file, options) => {
      options?.onProgress?.(20);
      return new Promise<UploadedMedia>((done) => { resolve = done; });
    });
    const onValue = vi.fn();
    const user = userEvent.setup();
    render(<Harness service={serviceWith(upload)} onValue={onValue} />);

    await user.upload(screen.getByLabelText("رفع صورة البنر"), new File(["image"], "banner.webp", { type: "image/webp" }));
    await user.click(await screen.findByRole("button", { name: "إلغاء الرفع" }));
    resolve(uploaded);

    await waitFor(() => expect(screen.getByRole("button", { name: "إعادة محاولة الرفع" })).toBeInTheDocument());
    expect(screen.getByRole("status", { name: "الرابط النهائي" })).toBeEmptyDOMElement();
    expect(onValue.mock.calls.flat()).not.toContain(uploaded.publicUrl);
  });
});
