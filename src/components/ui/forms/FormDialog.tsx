import { useWarnAboutChange } from "@refinedev/core";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState, type FormHTMLAttributes, type ReactNode } from "react";
import { Modal } from "../Modal";

type FormDialogProps = { open: boolean; title: string; dirty: boolean; submitting?: boolean; children: ReactNode | ((requestClose: () => void) => ReactNode); onClose: () => void };

export function FormDialog({ open, title, dirty, submitting = false, children, onClose }: FormDialogProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { warnWhenUnsavedChanges, setWarnWhen } = useWarnAboutChange();
  const shouldWarn = open && dirty && !submitting;

  useEffect(() => {
    if (warnWhenUnsavedChanges) setWarnWhen(shouldWarn);
    return () => { if (warnWhenUnsavedChanges) setWarnWhen(false); };
  }, [setWarnWhen, shouldWarn, warnWhenUnsavedChanges]);

  useEffect(() => { if (!open) setConfirmDiscard(false); }, [open]);

  function requestClose() {
    if (submitting) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }

  function discard() {
    setWarnWhen(false);
    setConfirmDiscard(false);
    onClose();
  }

  return <Modal open={open} title={confirmDiscard ? "تجاهل التغييرات؟" : title} onClose={confirmDiscard ? () => setConfirmDiscard(false) : requestClose}>
    {confirmDiscard ? <div className="form-confirmation"><span className="form-confirmation-icon"><AlertTriangle size={22} /></span><p>لديك تغييرات لم تُحفظ. هل تريد إغلاق النموذج وفقدانها؟</p><div className="modal-actions"><button className="button secondary" type="button" autoFocus onClick={() => setConfirmDiscard(false)}>متابعة التعديل</button><button className="button danger-button" type="button" onClick={discard}>تجاهل التغييرات</button></div></div> : typeof children === "function" ? children(requestClose) : children}
  </Modal>;
}

type ValidatedFormProps = FormHTMLAttributes<HTMLFormElement> & { children: ReactNode };

export function ValidatedForm({ children, ...props }: ValidatedFormProps) {
  return <form {...props} noValidate>{children}</form>;
}
