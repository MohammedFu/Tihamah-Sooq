import { Ban, CheckCircle2, Eye, Flag, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Drawer } from "../../../components/ui/Drawer";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { initialReports, type ReportRecord, type ReportStatus } from "../../../data/adminFixtures";
import { useAdminNotification } from "../../../providers/notificationStore";

type Resolution = "dismiss" | "delete" | "ban";

function reportColumns(onSelect: (report: ReportRecord) => void): DataTableColumn<ReportRecord>[] {
  return [
    { id: "id", header: "رقم البلاغ", className: "numeric", cell: (report) => <>#{report.id}</> },
    { id: "type", header: "النوع", cell: (report) => <span className={`reason-chip ${report.type === "احتيال" ? "critical" : ""}`}><Flag size={13} />{report.type}</span> },
    { id: "reporter", header: "المبلّغ", cell: (report) => report.reporter },
    { id: "listing", header: "الإعلان", cell: (report) => report.listing },
    { id: "accused", header: "المعلن عنه", cell: (report) => report.accused },
    { id: "createdAt", header: "الوقت", cell: (report) => report.createdAt },
    { id: "status", header: "الحالة", cell: (report) => <StatusBadge value={report.status} /> },
    { id: "action", header: "الإجراء", cell: (report) => <AuthorizedButton resource="reports" action="show" className="icon-button table-action" type="button" onClick={() => onSelect(report)} aria-label="عرض البلاغ" title="عرض البلاغ"><Eye size={17} /></AuthorizedButton> },
  ];
}

export function ReportsPage() {
  const [reports, setReports] = useState(initialReports);
  const table = useDataTableUrlState<"status">({ filters: [{ name: "status", defaultValue: "open", values: ["all", "open", "resolved"] }], defaultPageSize: 10, pageSizeOptions: [10, 20, 50] });
  const status = table.filters.status as "all" | ReportStatus;
  const [selected, setSelected] = useState<ReportRecord | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [notes, setNotes] = useState("");
  const notification = useAdminNotification();
  const visible = useMemo(() => reports.filter((report) => (status === "all" || report.status === status) && `${report.type} ${report.reporter} ${report.listing} ${report.accused}`.toLowerCase().includes(table.search.toLowerCase())), [reports, status, table.search]);
  const totalPages = Math.max(1, Math.ceil(visible.length / table.pageSize));
  const page = Math.min(table.page, totalPages);
  const rows = visible.slice((page - 1) * table.pageSize, page * table.pageSize);
  const columns = useMemo(() => reportColumns(setSelected), []);
  useEffect(() => { if (table.page > totalPages) table.setPage(totalPages); }, [table.page, totalPages]);

  function resolve() {
    if (!selected || !resolution || !notes.trim()) return;
    setReports((items) => items.map((item) => item.id === selected.id ? { ...item, status: "resolved" } : item));
    const message = resolution === "dismiss" ? "تم إغلاق البلاغ كبلاغ غير مثبت" : resolution === "delete" ? "تم حذف الإعلان وإغلاق البلاغ" : "تم حظر المعلن وإغلاق البلاغ";
    setSelected((item) => item ? { ...item, status: "resolved" } : item); setResolution(null); setNotes(""); notification.success(message);
  }

  return (
    <>
      <PageHeader title="البلاغات ومكافحة الاحتيال" description="مراجعة بلاغات المستخدمين واتخاذ إجراءات موثقة ضد الإعلانات والحسابات المخالفة." />
      <div className="summary-strip"><span><strong>{reports.filter((report) => report.status === "open").length}</strong> بلاغات مفتوحة</span><span><strong>3</strong> عالية الأولوية</span><span><strong>{reports.filter((report) => report.status === "resolved").length}</strong> أغلقت هذا الأسبوع</span></div>
      <section className="card data-surface">
        <div className="tabs-row"><button className={`tab-button ${status === "open" ? "active" : ""}`} onClick={() => table.setFilter("status", "open")} type="button">مفتوحة</button><button className={`tab-button ${status === "resolved" ? "active" : ""}`} onClick={() => table.setFilter("status", "resolved")} type="button">مغلقة</button><button className={`tab-button ${status === "all" ? "active" : ""}`} onClick={() => table.setFilter("status", "all")} type="button">الكل</button></div>
        <DataTable caption="قائمة بلاغات الاحتيال والمحتوى" columns={columns} rows={rows} rowKey={(report) => report.id} emptyMessage="لا توجد بلاغات مطابقة للفلاتر الحالية." pagination={{ page, pageSize: table.pageSize, total: visible.length, pageSizeOptions: table.pageSizeOptions }} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} toolbar={<div className="filters-row"><label className="field-with-icon"><Search size={16} /><input value={table.search} onChange={(event) => table.setSearch(event.target.value)} placeholder="بحث في البلاغات والأطراف" aria-label="البحث في البلاغات" /></label><span className="record-count">{visible.length} بلاغ</span></div>} />
      </section>
      <Drawer open={Boolean(selected)} title={selected ? `البلاغ #${selected.id}` : ""} onClose={() => setSelected(null)}>{selected && <div className="detail-stack">
        <div className="detail-title-row"><span className={`reason-chip ${selected.type === "احتيال" ? "critical" : ""}`}><Flag size={14} />{selected.type}</span><StatusBadge value={selected.status} /></div>
        <div className="report-note"><small>ملاحظات المُبلّغ</small><p>{selected.notes}</p></div>
        <dl className="detail-grid"><div><dt>مقدم البلاغ</dt><dd>{selected.reporter}</dd></div><div><dt>المستخدم المبلغ عنه</dt><dd>{selected.accused}</dd></div><div><dt>الإعلان المرتبط</dt><dd>{selected.listing}</dd></div><div><dt>تاريخ البلاغ</dt><dd>{selected.createdAt}</dd></div></dl>
        {selected.status === "open" && <div className="moderation-menu"><AuthorizedButton resource="reports" action="resolve" type="button" onClick={() => setResolution("dismiss")}><CheckCircle2 size={18} /><span><strong>إغلاق كبلاغ غير مثبت</strong><small>لا يوجد إجراء على الإعلان أو المستخدم</small></span></AuthorizedButton><AuthorizedButton resource="reports" action="resolve" additionallyRequires={[{ resource: "listings", action: "delete" }]} type="button" onClick={() => setResolution("delete")}><Trash2 size={18} /><span><strong>حذف الإعلان المخالف</strong><small>إخفاء الإعلان فوراً من تطبيق الموبايل</small></span></AuthorizedButton><AuthorizedButton resource="reports" action="resolve" additionallyRequires={[{ resource: "users", action: "ban" }]} className="danger" type="button" onClick={() => setResolution("ban")}><Ban size={18} /><span><strong>حظر المعلن</strong><small>إنهاء الجلسات ومنع تسجيل الدخول</small></span></AuthorizedButton></div>}
      </div>}</Drawer>
      <Modal open={Boolean(resolution)} title="توثيق قرار البلاغ" onClose={() => setResolution(null)}><label className="form-field"><span>ملاحظات الإجراء</span><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="دوّن سبب القرار ليُحفظ في سجل التدقيق" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setResolution(null)}>إلغاء</button><AuthorizedButton resource="reports" action="resolve" additionallyRequires={resolution === "delete" ? [{ resource: "listings", action: "delete" }] : resolution === "ban" ? [{ resource: "users", action: "ban" }] : []} className="button" type="button" disabled={!notes.trim()} onClick={resolve}>تأكيد وتنفيذ</AuthorizedButton></div></Modal>
    </>
  );
}
