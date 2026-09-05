import { BellRing, History, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { usePermissions } from "@refinedev/core";
import { useEffect, useState } from "react";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Toast } from "../../../components/ui/Toast";
import { auditLogs } from "../../../data/adminFixtures";
import { canAccessWithPermissions } from "../../../providers/accessControlProvider";
import type { Permission } from "../../../types/domain";

type SystemTab = "broadcast" | "audit";

export function SystemPage() {
  const permissions = usePermissions<readonly Permission[]>({});
  const [tab, setTab] = useState<SystemTab>("broadcast");
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState("");
  const canBroadcast = permissions.isSuccess && canAccessWithPermissions(permissions.data, "notifications", "broadcast");
  const canAudit = permissions.isSuccess && canAccessWithPermissions(permissions.data, "audit", "list");
  useEffect(() => {
    if (permissions.isSuccess && ((tab === "broadcast" && !canBroadcast) || (tab === "audit" && !canAudit))) {
      if (canBroadcast) setTab("broadcast");
      else if (canAudit) setTab("audit");
    }
  }, [canAudit, canBroadcast, permissions.isSuccess, tab]);
  function send() { if (!title.trim() || !body.trim()) return; setToast("تمت جدولة الإشعار للإرسال عبر FCM"); setTitle(""); setBody(""); window.setTimeout(() => setToast(""), 2800); }

  return (
    <>
      <PageHeader title="الإشعارات وسجل التدقيق" description="إرسال التنبيهات العامة ومراجعة السجل المحمي لكل إجراء إداري." />
      <div className="segmented">{canBroadcast && <button type="button" className={tab === "broadcast" ? "active" : ""} onClick={() => setTab("broadcast")}><BellRing size={17} />بث الإشعارات</button>}{canAudit && <button type="button" className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}><History size={17} />سجل التدقيق</button>}</div>
      {canBroadcast && tab === "broadcast" ? <div className="system-grid">
        <section className="card panel broadcast-form"><div className="panel-title"><div><h2>إنشاء إشعار عام</h2><p className="panel-copy">سيصل الإشعار إلى الأجهزة المسجلة ضمن النطاق المحدد.</p></div></div><label className="form-field"><span>الجمهور المستهدف</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="all">جميع المستخدمين</option><option value="region">مستخدمو منطقة محددة</option><option value="village">مستخدمو قرية محددة</option></select></label>{audience !== "all" && <label className="form-field"><span>{audience === "region" ? "المنطقة" : "القرية"}</span><select><option>اختر من القائمة</option><option>جازان - تهامة</option><option>سهل تهامة</option><option>القنفذة</option></select></label>}<label className="form-field"><span>عنوان الإشعار</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="مثال: تحديث جديد في سوق تهامة" /><small>{title.length}/80</small></label><label className="form-field"><span>نص الإشعار</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={220} rows={5} placeholder="اكتب رسالة قصيرة وواضحة للمستخدمين" /><small>{body.length}/220</small></label><AuthorizedButton resource="notifications" action="broadcast" className="button" type="button" disabled={!title.trim() || !body.trim()} onClick={send}><Send size={17} />مراجعة وإرسال</AuthorizedButton></section>
        <aside className="card panel"><h2>معاينة الإشعار</h2><div className="phone-preview"><div className="phone-status">9:41</div><div className="push-preview"><span className="brand-mark">ت</span><div><strong>{title || "سوق تهامة"}</strong><p>{body || "سيظهر نص الإشعار هنا قبل الإرسال."}</p><small>الآن</small></div></div></div><div className="delivery-note"><ShieldCheck size={18} /><div><strong>إرسال آمن عبر FCM</strong><p>يتم تسجيل المشرف والنطاق والوقت في سجل التدقيق.</p></div></div></aside>
      </div> : canAudit && tab === "audit" ? <section className="card data-surface">
        <div className="table-toolbar"><div><h2>سجل العمليات الإدارية</h2><p className="panel-copy">سجل للقراءة فقط ومحمي من التعديل أو الحذف.</p></div><span className="read-only"><LockKeyhole size={15} />Append-only</span></div>
        <div className="table-wrap"><table><thead><tr><th>الرقم</th><th>المشرف</th><th>الإجراء</th><th>الكيان</th><th>عنوان IP</th><th>الوقت</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id}><td className="numeric">#{log.id}</td><td>{log.admin}</td><td><code className="action-code">{log.action}</code></td><td><code>{log.entity}</code></td><td dir="ltr">{log.ip}</td><td>{log.at}</td></tr>)}</tbody></table></div>
      </section> : permissions.isSuccess ? <section className="card route-state" role="alert"><LockKeyhole size={28} /><p>لا تتوفر أقسام نظامية ضمن صلاحيات حسابك الحالية.</p></section> : null}
      <Toast message={toast} />
    </>
  );
}
