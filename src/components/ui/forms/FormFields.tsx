import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type FieldMeta = { label: string; error?: string; hint?: string };

function describedBy(id: string, error?: string, hint?: string, existing?: string) {
  return [existing, hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

type TextFieldProps = FieldMeta & InputHTMLAttributes<HTMLInputElement>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, error, hint, id: suppliedId, "aria-describedby": ariaDescribedBy, ...props }, ref) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="form-field"><label htmlFor={id}>{label}</label><input {...props} ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint, ariaDescribedBy)} />{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <small className="form-field-error" id={`${id}-error`} role="alert">{error}</small>}</div>;
});

type SelectFieldProps = FieldMeta & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode };

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField({ label, error, hint, id: suppliedId, "aria-describedby": ariaDescribedBy, children, ...props }, ref) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="form-field"><label htmlFor={id}>{label}</label><select {...props} ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint, ariaDescribedBy)}>{children}</select>{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <small className="form-field-error" id={`${id}-error`} role="alert">{error}</small>}</div>;
});

type TextareaFieldProps = FieldMeta & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField({ label, error, hint, id: suppliedId, "aria-describedby": ariaDescribedBy, ...props }, ref) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="form-field"><label htmlFor={id}>{label}</label><textarea {...props} ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint, ariaDescribedBy)} />{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <small className="form-field-error" id={`${id}-error`} role="alert">{error}</small>}</div>;
});

type DateFieldProps = Omit<TextFieldProps, "type">;

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(props, ref) {
  return <TextField {...props} ref={ref} type="date" />;
});

type FileUploadFieldProps = FieldMeta & Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { title: string };

export const FileUploadField = forwardRef<HTMLInputElement, FileUploadFieldProps>(function FileUploadField({ label, title, error, hint, id: suppliedId, "aria-describedby": ariaDescribedBy, ...props }, ref) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="form-upload"><label className="upload-field" htmlFor={id}><span><strong>{title}</strong><small>{label}</small></span><input {...props} ref={ref} id={id} type="file" aria-label={title} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint, ariaDescribedBy)} /></label>{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <small className="form-field-error" id={`${id}-error`} role="alert">{error}</small>}</div>;
});

type ToggleFieldProps = FieldMeta & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const ToggleField = forwardRef<HTMLInputElement, ToggleFieldProps>(function ToggleField({ label, error, hint, id: suppliedId, "aria-describedby": ariaDescribedBy, ...props }, ref) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="form-toggle-field"><label className="form-toggle" htmlFor={id}><strong>{label}</strong><input {...props} ref={ref} id={id} type="checkbox" role="switch" aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint, ariaDescribedBy)} /><i aria-hidden="true" /></label>{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <small className="form-field-error" id={`${id}-error`} role="alert">{error}</small>}</div>;
});
