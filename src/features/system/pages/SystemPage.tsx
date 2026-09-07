import { BellRing, History, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { usePermissions } from "@refinedev/core";
import { useEffect, useState, type KeyboardEvent } from "react";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { PageHeader } from "../../../components/ui/PageHeader";
import { auditLogs } from "../../../data/adminFixtures";
import { canAccessWithPermissions } from "../../../providers/accessControlProvider";
import { useAdminNotification } from "../../../providers/notificationStore";
import type { Permission } from "../../../types/domain";

type SystemTab = "broadcast" | "audit";
type AuditLog = (typeof auditLogs)[number];

const auditColumns: DataTableColumn<AuditLog>[] = [
  { id: "id", header: "الرقم", className: "numeric", cell: (log) => <bdi dir="ltr">#{log.id}</bdi> },
  { id: "admin", header: "المشرف", cell: (log) => log.admin },
  { id: "action", header: "الإجراء", cell: (log) => <code className="action-code" dir="ltr">{log.action}</code> },
  { id: "entity", header: "الكيان", cell: (log) => <code dir="ltr">{log.entity}</code> },
  { id: "ip", header: "عنوان IP", cell: (log) => <bdi dir="ltr">{log.ip}</bdi> },
  { id: "at", header: "الوقت", cell: (log) => log.at },
];

export function SystemPage() {
  const permissions = usePermissions<readonly Permission[]>({});
  const [tab, setTab] = useState<SystemTab>("broadcast");
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const notification = useAdminNotification();
  const table = useDataTableUrlState({ defaultPageSize: 10, pageSizeOptions: [10, 20, 50] });
  const canBroadcast = permissions.isSuccess && canAccessWithPermissions(permissions.data, "notifications", "broadcast");
  const canAudit = permissions.isSuccess && canAccessWithPermissions(permissions.data, "audit", "list");
  useEffect(() => {
    if (permissions.isSuccess && ((tab === "broadcast" && !canBroadcast) || (tab === "audit" && !canAudit))) {
      if (canBroadcast) setTab("broadcast");
      else if (canAudit) setTab("audit");
    }
  }, [canAudit, canBroadcast, permissions.isSuccess, tab]);
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const availableTabs = ([canBroadcast && "broadcast", canAudit && "audit"] as const).filter((item): item is SystemTab => Boolean(item));
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || availableTabs.length < 2) return;
    event.preventDefault();
    const currentIndex = availableTabs.indexOf(tab);
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? availableTabs.length - 1 : event.key === "ArrowLeft" ? (currentIndex + 1) % availableTabs.length : (currentIndex - 1 + availableTabs.length) % availableTabs.length;
    const next = availableTabs[nextIndex];
    setTab(next);
    window.requestAnimationFrame(() => document.getElementById(`system-${next}-tab`)?.focus());
  }
  function send() { if (!title.trim() || !body.trim()) return; notification.success("تمت جدولة الإشعار للإرسال عبر FCM"); setTitle(""); setBody(""); }
  const auditTotalPages = Math.max(1, Math.ceil(auditLogs.length / table.pageSize));
  const auditPage = Math.min(table.page, auditTotalPages);
  const auditRows = auditLogs.slice((auditPage - 1) * table.pageSize, auditPage * table.pageSize);
  useEffect(() => { if (table.page > auditTotalPages) table.setPage(auditTotalPages); }, [auditTotalPages, table.page]);

  return (
    <>
      <PageHeader title="الإشعارات وسجل التدقيق" description="إرسال التنبيهات العامة ومراجعة السجل المحمي لكل إجراء إداري." />
      <div className="segmented" role="tablist" aria-label="أقسام النظام">{canBroadcast && <button id="system-broadcast-tab" type="button" role="tab" tabIndex={tab === "broadcast" ? 0 : -1} aria-selected={tab === "broadcast"} aria-controls="system-broadcast-panel" className={tab === "broadcast" ? "active" : ""} onKeyDown={handleTabKey} onClick={() => setTab("broadcast")}><BellRing aria-hidden="true" size={17} />بث الإشعارات</button>}{canAudit && <button id="system-audit-tab" type="button" role="tab" tabIndex={tab === "audit" ? 0 : -1} aria-selected={tab === "audit"} aria-controls="system-audit-panel" className={tab === "audit" ? "active" : ""} onKeyDown={handleTabKey} onClick={() => setTab("audit")}><History aria-hidden="true" size={17} />سجل التدقيق</button>}</div>
      {canBroadcast && tab === "broadcast" ? <div className="system-grid">
        <section className="card panel broadcast-form" id="system-broadcast-panel" role="tabpanel" aria-labelledby="system-broadcast-tab"><div className="panel-title"><div><h2>إنشاء إشعار عام</h2><p className="panel-copy">سيصل الإشعار إلى الأجهزة المسجلة ضمن النطاق المحدد.</p></div></div><label className="form-field"><span>الجمهور المستهدف</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="all">جميع المستخدمين</option><option value="region">مستخدمو منطقة محددة</option><option value="village">مستخدمو قرية محددة</option></select></label>{audience !== "all" && <label className="form-field"><span>{audience === "region" ? "المنطقة" : "القرية"}</span><select><option>اختر من القائمة</option><option>جازان - تهامة</option><option>سهل تهامة</option><option>القنفذة</option></select></label>}<label className="form-field"><span>عنوان الإشعار</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="مثال: تحديث جديد في سوق تهامة" /><small>{title.length}/80</small></label><label className="form-field"><span>نص الإشعار</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={220} rows={5} placeholder="اكتب رسالة قصيرة وواضحة للمستخدمين" /><small>{body.length}/220</small></label><AuthorizedButton resource="notifications" action="broadcast" className="button" type="button" disabled={!title.trim() || !body.trim()} onClick={send}><Send size={17} />مراجعة وإرسال</AuthorizedButton></section>
        <aside className="card panel"><h2>معاينة الإشعار</h2><div className="phone-preview"><div className="phone-status">9:41</div><div className="push-preview"><span className="brand-mark">ت</span><div><strong>{title || "سوق تهامة"}</strong><p>{body || "سيظهر نص الإشعار هنا قبل الإرسال."}</p><small>الآن</small></div></div></div><div className="delivery-note"><ShieldCheck size={18} /><div><strong>إرسال آمن عبر FCM</strong><p>يتم تسجيل المشرف والنطاق والوقت في سجل التدقيق.</p></div></div></aside>
      </div> : canAudit && tab === "audit" ? <section className="card data-surface" id="system-audit-panel" role="tabpanel" aria-labelledby="system-audit-tab">
        <DataTable caption="سجل العمليات الإدارية للقراءة فقط" columns={auditColumns} rows={auditRows} rowKey={(log) => log.id} emptyMessage="لا توجد عمليات تدقيق." pagination={{ page: auditPage, pageSize: table.pageSize, total: auditLogs.length, pageSizeOptions: table.pageSizeOptions }} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} toolbar={<div className="table-toolbar"><div><h2>سجل العمليات الإدارية</h2><p className="panel-copy">سجل للقراءة فقط ومحمي من التعديل أو الحذف.</p></div><span className="read-only"><LockKeyhole size={15} />Append-only</span></div>} />
      </section> : permissions.isSuccess ? <section className="card route-state" role="alert"><LockKeyhole size={28} /><p>لا تتوفر أقسام نظامية ضمن صلاحيات حسابك الحالية.</p></section> : null}
    </>
  );
}
