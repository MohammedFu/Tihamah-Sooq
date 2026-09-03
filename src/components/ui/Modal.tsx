import { X } from "lucide-react";
import type { ReactNode } from "react";

type ModalProps = { open: boolean; title: string; children: ReactNode; onClose: () => void };

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-layer" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-head"><h2>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
