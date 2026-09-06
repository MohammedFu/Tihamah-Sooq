import { X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

type ModalProps = { open: boolean; title: string; children: ReactNode; onClose: () => void };

export function Modal({ open, title, children, onClose }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const returnTargetRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current) returnTargetRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  wasOpenRef.current = open;

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (dialogRef.current?.contains(document.activeElement)) return;
      const preferred = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus], [autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])");
      preferred?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (returnTargetRef.current?.isConnected) returnTargetRef.current.focus();
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;
  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={handleKeyDown}>
        <div className="drawer-head"><h2 id={titleId}>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
