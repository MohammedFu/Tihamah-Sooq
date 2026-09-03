import { X } from "lucide-react";
import type { ReactNode } from "react";

type DrawerProps = { open: boolean; title: string; children: ReactNode; onClose: () => void };

export function Drawer({ open, title, children, onClose }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="drawer-layer" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-head"><div><p className="eyebrow">تفاصيل السجل</p><h2>{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
