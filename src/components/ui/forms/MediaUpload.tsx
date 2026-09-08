import { CheckCircle2, FileImage, RefreshCcw, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { ApiError } from "../../../services/http";
import {
  DEFAULT_MEDIA_POLICIES,
  type MediaKind,
  type MediaPolicy,
  type MediaService,
} from "../../../services/admin/media";
import "./MediaUpload.css";

export type MediaUploadStatus = "idle" | "validating" | "uploading" | "success" | "error" | "cancelled";

export type MediaUploadProps = Readonly<{
  id?: string;
  label: string;
  title?: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (publicUrl: string) => void;
  service: MediaService;
  allowedKinds?: readonly MediaKind[];
  policies?: Partial<Readonly<Record<MediaKind, MediaPolicy>>>;
  disabled?: boolean;
  required?: boolean;
  onStatusChange?: (status: MediaUploadStatus) => void;
}>;

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.userMessage;
  return "تعذر رفع الملف. حاول مرة أخرى.";
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("ar-SA")} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toLocaleString("ar-SA", { maximumFractionDigits: 1 })} ميجابايت`;
}

function acceptFor(
  allowedKinds: readonly MediaKind[],
  policies: Partial<Readonly<Record<MediaKind, MediaPolicy>>> | undefined,
) {
  return allowedKinds
    .flatMap((kind) => Object.keys(policies?.[kind]?.mimeExtensions ?? DEFAULT_MEDIA_POLICIES[kind].mimeExtensions))
    .join(",");
}

export function MediaUpload({
  id: suppliedId,
  label,
  title = "اختيار ملف وسائط",
  hint,
  error,
  value,
  onChange,
  service,
  allowedKinds = ["image", "video"],
  policies,
  disabled = false,
  required = false,
  onStatusChange,
}: MediaUploadProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorText = error;
  const externalErrorId = errorText ? `${id}-error` : undefined;
  const [status, setStatus] = useState<MediaUploadStatus>(value ? "success" : "idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const operationRef = useRef(0);
  const busy = status === "validating" || status === "uploading";
  const describedBy = [hintId, externalErrorId, uploadError ? `${id}-upload-error` : null].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => () => {
    operationRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  async function startUpload(file: File) {
    controllerRef.current?.abort();
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    const controller = new AbortController();
    controllerRef.current = controller;
    setSelectedFile(file);
    setUploadError(null);
    setProgress(0);
    setStatus("validating");
    onChange("");

    try {
      const result = await service.upload(file, {
        allowedKinds,
        policies,
        signal: controller.signal,
        onProgress: (next) => {
          if (operation !== operationRef.current || controller.signal.aborted) return;
          setStatus("uploading");
          setProgress(next);
        },
      });
      if (operation !== operationRef.current || controller.signal.aborted) return;
      onChange(result.publicUrl);
      setProgress(100);
      setStatus("success");
    } catch (caught) {
      if (operation !== operationRef.current) return;
      if (caught instanceof ApiError && caught.kind === "aborted") {
        setStatus("cancelled");
      } else {
        setUploadError(errorMessage(caught));
        setStatus("error");
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void startUpload(file);
  }

  function cancelUpload() {
    operationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    onChange("");
    setProgress(0);
    setStatus("cancelled");
  }

  function clearFile() {
    operationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setSelectedFile(null);
    setUploadError(null);
    setProgress(0);
    setStatus("idle");
    onChange("");
  }

  return (
    <div className="media-upload" data-status={status}>
      <label className="media-upload-picker" htmlFor={id} aria-disabled={disabled || busy}>
        <span className="media-upload-icon"><UploadCloud aria-hidden="true" size={21} /></span>
        <span><strong>{title}</strong><small>{label}</small></span>
        <input
          id={id}
          type="file"
          accept={acceptFor(allowedKinds, policies)}
          aria-label={title}
          aria-invalid={Boolean(errorText || uploadError)}
          aria-describedby={describedBy}
          disabled={disabled || busy}
          required={required && !value}
          onChange={selectFile}
        />
      </label>

      {hint && <small id={hintId} className="media-upload-hint">{hint}</small>}
      {errorText && <small id={externalErrorId} className="form-field-error" role="alert">{errorText}</small>}

      {(selectedFile || value) && (
        <div className="media-upload-file" aria-live="polite">
          <FileImage aria-hidden="true" size={18} />
          <span>
            <strong>{selectedFile?.name ?? "ملف وسائط محفوظ"}</strong>
            <small>{selectedFile ? `${formatBytes(selectedFile.size)} · ${selectedFile.type || "نوع غير معروف"}` : "الرابط العام محفوظ في النموذج"}</small>
          </span>
          {status === "success" && <CheckCircle2 className="media-upload-success" aria-label="اكتمل الرفع" size={19} />}
        </div>
      )}

      {busy && (
        <div className="media-upload-progress" role="status">
          <span>{status === "validating" ? "جارٍ التحقق من الملف…" : `جارٍ الرفع… ${progress.toLocaleString("ar-SA")}%`}</span>
          <progress aria-label="تقدم رفع الوسائط" max={100} value={progress} />
          <button className="button secondary" type="button" onClick={cancelUpload}><X aria-hidden="true" size={15} />إلغاء الرفع</button>
        </div>
      )}

      {uploadError && <small id={`${id}-upload-error`} className="form-field-error" role="alert">{uploadError}</small>}

      {!busy && selectedFile && (status === "error" || status === "cancelled") && (
        <button className="button secondary media-upload-action" type="button" disabled={disabled} onClick={() => { void startUpload(selectedFile); }}>
          <RefreshCcw aria-hidden="true" size={15} />إعادة محاولة الرفع
        </button>
      )}
      {!busy && (value || selectedFile) && status !== "error" && status !== "cancelled" && (
        <button className="button secondary media-upload-action" type="button" disabled={disabled} onClick={clearFile}>
          <X aria-hidden="true" size={15} />إزالة الملف
        </button>
      )}
    </div>
  );
}
