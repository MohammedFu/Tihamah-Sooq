import { Ban, CheckCircle2, Eye, Flag, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Drawer } from "../../../components/ui/Drawer";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { initialReports, type ReportRecord, type ReportStatus } from "../../../data/adminFixtures";

type Resolution = "dismiss" | "delete" | "ban";

export function ReportsPage() {
  const [reports, setReports] = useState(initialReports);
  const [status, setStatus] = useState<"all" | ReportStatus>("open");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReportRecord | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState("");
  const visible = useMemo(() => reports.filter((report) => (status === "all" || report.status === status) && `${report.type} ${report.reporter} ${report.listing} ${report.accused}`.toLowerCase().includes(query.toLowerCase())), [query, reports, status]);

  function resolve() {
    if (!selected || !resolution || !notes.trim()) return;
    setReports((items) => items.map((item) => item.id === selected.id ? { ...item, status: "resolved" } : item));
    const message = resolution === "dismiss" ? "تم إغلاق البلاغ كبلاغ غير مثبت" : resolution === "delete" ? "تم حذف الإعلان وإغلاق البلاغ" : "تم حظر المعلن وإغلاق البلاغ";
    setSelected((item) => item ? { ...item, status: "resolved" } : item); setResolution(null); setNotes(""); setToast(message); window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <>
      <PageHeader title="البلاغات ومكافحة الاحتيال" description="مراجعة بلاغات المستخدمين واتخاذ إجراءات موثقة ضد الإعلانات والحسابات المخالفة." />
      <div className="summary-strip"><span><strong>{reports.filter((report) => report.status === "open").length}</strong> بلاغات مفتوحة</span><span><strong>3</strong> عالية الأولوية</span><span><strong>{reports.filter((report) => report.status === "resolved").length}</strong> أغلقت هذا الأسبوع</span></div>
      <section className="card data-surface">
        <div className="tabs-row"><button className={`tab-button ${status === "open" ? "active" : ""}`} onClick={() => setStatus("open")} type="button">مفتوحة</button><button className={`tab-button ${status === "resolved" ? "active" : ""}`} onClick={() => setStatus("resolved")} type="button">مغلقة</button><button className={`tab-button ${status === "all" ? "active" : ""}`} onClick={() => setStatus("all")} type="button">الكل</button></div>
        <div className="filters-row"><label className="field-with-icon"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث في البلاغات والأطراف" /></label><span className="record-count">{visible.length} بلاغ</span></div>
        <div className="table-wrap"><table><thead><tr><th>رقم البلاغ</th><th>النوع</th><th>المبلغ</th><th>الإعلان</th><th>المعلن عنه</th><th>الوقت</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>
          {visible.map((report) => <tr key={report.id}><td className="numeric">#{report.id}</td><td><span className={`reason-chip ${report.type === "احتيال" ? "critical" : ""}`}><Flag size={13} />{report.type}</span></td><td>{report.reporter}</td><td>{report.listing}</td><td>{report.accused}</td><td>{report.createdAt}</td><td><StatusBadge value={report.status} /></td><td><button className="icon-button table-action" type="button" onClick={() => setSelected(report)} aria-label="عرض البلاغ"><Eye size={17} /></button></td></tr>)}
        </tbody></table></div>
      </section>
      <Drawer open={Boolean(selected)} title={selected ? `البلاغ #${selected.id}` : ""} onClose={() => setSelected(null)}>{selected && <div className="detail-stack">
        <div className="detail-title-row"><span className={`reason-chip ${selected.type === "احتيال" ? "critical" : ""}`}><Flag size={14} />{selected.type}</span><StatusBadge value={selected.status} /></div>
        <div className="report-note"><small>ملاحظات المُبلّغ</small><p>{selected.notes}</p></div>
        <dl className="detail-grid"><div><dt>مقدم البلاغ</dt><dd>{selected.reporter}</dd></div><div><dt>المستخدم المبلغ عنه</dt><dd>{selected.accused}</dd></div><div><dt>الإعلان المرتبط</dt><dd>{selected.listing}</dd></div><div><dt>تاريخ البلاغ</dt><dd>{selected.createdAt}</dd></div></dl>
        {selected.status === "open" && <div className="moderation-menu"><button type="button" onClick={() => setResolution("dismiss")}><CheckCircle2 size={18} /><span><strong>إغلاق كبلاغ غير مثبت</strong><small>لا يوجد إجراء على الإعلان أو المستخدم</small></span></button><button type="button" onClick={() => setResolution("delete")}><Trash2 size={18} /><span><strong>حذف الإعلان المخالف</strong><small>إخفاء الإعلان فوراً من تطبيق الموبايل</small></span></button><button className="danger" type="button" onClick={() => setResolution("ban")}><Ban size={18} /><span><strong>حظر المعلن</strong><small>إنهاء الجلسات ومنع تسجيل الدخول</small></span></button></div>}
      </div>}</Drawer>
      <Modal open={Boolean(resolution)} title="توثيق قرار البلاغ" onClose={() => setResolution(null)}><label className="form-field"><span>ملاحظات الإجراء</span><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="دوّن سبب القرار ليُحفظ في سجل التدقيق" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setResolution(null)}>إلغاء</button><button className="button" type="button" disabled={!notes.trim()} onClick={resolve}>تأكيد وتنفيذ</button></div></Modal>
      <Toast message={toast} />
    </>
  );
}
