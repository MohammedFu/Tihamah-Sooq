import { AlertCircle, AlertTriangle, CheckCircle2, Info, LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";
import type { AdminNotification } from "../../providers/notificationStore";

type ToastProps = { notification: AdminNotification; onDismiss: (key: string) => void };

const icons = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info, progress: LoaderCircle };

export function Toast({ notification, onDismiss }: ToastProps) {
  useEffect(() => {
    if (notification.durationMs === null) return;
    const timer = window.setTimeout(() => onDismiss(notification.key), notification.durationMs);
    return () => window.clearTimeout(timer);
  }, [notification.durationMs, notification.key, notification.revision, onDismiss]);

  const Icon = icons[notification.type];
  const urgent = notification.type === "error" || notification.type === "warning";

  return <article className={`toast ${notification.type}`} role={urgent ? "alert" : "status"} aria-atomic="true" aria-busy={notification.type === "progress"}>
    <Icon className={notification.type === "progress" ? "toast-spinner" : undefined} size={19} aria-hidden="true" />
    <div className="toast-copy"><strong>{notification.message}</strong>{notification.description && <p>{notification.description}</p>}</div>
    {notification.action && <button className="toast-action" type="button" onClick={() => { notification.action?.onClick(); if (notification.action?.dismissOnClick !== false) onDismiss(notification.key); }}>{notification.action.label}</button>}
    <button className="toast-dismiss" type="button" onClick={() => onDismiss(notification.key)} aria-label={`إغلاق الإشعار: ${notification.message}`}><X size={16} /></button>
  </article>;
}
