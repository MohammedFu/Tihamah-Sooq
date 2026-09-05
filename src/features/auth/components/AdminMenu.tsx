import { useGetIdentity, useLogout } from "@refinedev/core";
import { ChevronDown, LoaderCircle, LogOut, UserRound, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { AdminAccountIdentity } from "../../../types/domain";

const expiryFormatter = new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" });

export function AdminMenu() {
  const identity = useGetIdentity<AdminAccountIdentity | null>();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const account = identity.isError ? null : identity.data;
  const expiresAt = account?.sessionExpiresAt;
  const { refetch } = identity;

  useEffect(() => {
    if (!expiresAt) return;
    const timeout = window.setTimeout(() => { void refetch(); }, Math.min(Math.max(0, Date.parse(expiresAt) - Date.now()), 2_147_483_647));
    return () => window.clearTimeout(timeout);
  }, [expiresAt, refetch, identity.dataUpdatedAt]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const logoutFailed = logout.isError || logout.data?.success === false;

  return (
    <div className="admin-menu" ref={containerRef} onBlur={(event) => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button className="admin-menu-trigger" ref={triggerRef} type="button" aria-label={`حساب الإدارة: ${account?.name ?? "معلومات الحساب"}`} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((current) => !current)}>
        <span className="admin-copy"><strong><bdi>{account?.name ?? "حساب الإدارة"}</bdi></strong><small><bdi>{account?.roleName ?? (identity.isLoading ? "جارٍ تحميل الحساب..." : "معلومات الحساب")}</bdi></small></span>
        <span className="avatar" aria-hidden="true">{account?.initials ?? <UserRound size={18} />}</span>
        <ChevronDown aria-hidden="true" size={15} />
      </button>
      {open && (
        <div className="admin-menu-panel" id={panelId} role="region" aria-labelledby={titleId} tabIndex={-1} ref={panelRef}>
          <div className="admin-menu-heading"><h2 id={titleId}>معلومات حساب الإدارة</h2><button className="icon-button" type="button" aria-label="إغلاق معلومات الحساب" onClick={close}><X aria-hidden="true" size={16} /></button></div>
          {identity.isLoading ? <p role="status">جارٍ تحميل بيانات الحساب...</p> : identity.isError ? (
            <div><p role="alert">تعذر تحميل بيانات الحساب.</p><button className="button secondary" type="button" disabled={identity.isFetching} onClick={() => { void refetch(); }}>إعادة المحاولة</button></div>
          ) : account ? (
            <dl className="admin-menu-details">
              <div><dt>الاسم</dt><dd><bdi>{account.name}</bdi></dd></div>
              <div><dt>الدور</dt><dd><bdi>{account.roleName}</bdi></dd></div>
              <div><dt>البريد الإلكتروني</dt><dd><bdi dir="ltr">{account.email ?? "غير متاح"}</bdi></dd></div>
              <div><dt>رقم الجوال</dt><dd><bdi dir="ltr">{account.phone ?? "غير متاح"}</bdi></dd></div>
              <div><dt>تنتهي الجلسة (التوقيت المحلي)</dt><dd>{account.sessionExpiresAt ? <time dateTime={account.sessionExpiresAt}>{expiryFormatter.format(new Date(account.sessionExpiresAt))}</time> : "غير متاح"}</dd></div>
            </dl>
          ) : <p role="status">لا تتوفر جلسة دخول صالحة.</p>}
          {account && <p className="admin-menu-session-note">تسجيل الدخول محفوظ في علامة التبويب الحالية.</p>}
          {logoutFailed && <p role="alert">تعذر تسجيل الخروج. حاول مرة أخرى.</p>}
          <button className="button secondary admin-menu-logout" type="button" aria-label="تسجيل الخروج" disabled={logout.isPending} onClick={() => logout.mutate()}>
            {logout.isPending ? <LoaderCircle className="auth-spinner" aria-hidden="true" size={17} /> : <LogOut aria-hidden="true" size={17} />}
            {logout.isPending ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
          </button>
        </div>
      )}
    </div>
  );
}
