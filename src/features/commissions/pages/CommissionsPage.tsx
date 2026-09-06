import { Check, Eye, FileCheck2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Drawer } from "../../../components/ui/Drawer";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { initialCommissions, type CommissionRecord, type CommissionStatus } from "../../../data/adminFixtures";

function commissionColumns(onSelect: (record: CommissionRecord) => void): DataTableColumn<CommissionRecord>[] {
  return [
    { id: "seller", header: "البائع", cell: (item) => <><strong>{item.seller}</strong><small className="block-copy" dir="ltr">{item.phone}</small></> },
    { id: "listing", header: "الإعلان المباع", cell: (item) => <>{item.listing}<small className="block-copy">فاتورة #{item.id}</small></> },
    { id: "soldPrice", header: "قيمة البيع", className: "numeric", cell: (item) => <>{item.soldPrice.toLocaleString("ar-SA")} ر.س</> },
    { id: "amount", header: "العمولة 1%", className: "numeric emphasis", cell: (item) => <>{item.amount.toLocaleString("ar-SA")} ر.س</> },
    { id: "reference", header: "مرجع التحويل", cell: (item) => item.reference },
    { id: "status", header: "الحالة", cell: (item) => <StatusBadge value={item.status} /> },
    { id: "action", header: "التدقيق", cell: (item) => <AuthorizedButton resource="commissions" action="show" className="icon-button table-action" type="button" onClick={() => onSelect(item)} aria-label="تدقيق العمولة" title="تدقيق العمولة"><Eye size={17} /></AuthorizedButton> },
  ];
}

export function CommissionsPage() {
  const [items, setItems] = useState(initialCommissions);
  const table = useDataTableUrlState<"status">({ filters: [{ name: "status", defaultValue: "all", values: ["all", "paid", "unpaid", "verified", "rejected"] }], defaultPageSize: 10, pageSizeOptions: [10, 20, 50] });
  const status = table.filters.status as "all" | CommissionStatus;
  const [selected, setSelected] = useState<CommissionRecord | null>(null);
  const [rejecting, setRejecting] = useState<CommissionRecord | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const visible = useMemo(() => items.filter((item) => (status === "all" || item.status === status) && `${item.seller} ${item.phone} ${item.listing} ${item.reference}`.toLowerCase().includes(table.search.toLowerCase())), [items, status, table.search]);
  const totalPages = Math.max(1, Math.ceil(visible.length / table.pageSize));
  const page = Math.min(table.page, totalPages);
  const rows = visible.slice((page - 1) * table.pageSize, page * table.pageSize);
  const columns = useMemo(() => commissionColumns(setSelected), []);
  useEffect(() => { if (table.page > totalPages) table.setPage(totalPages); }, [table.page, totalPages]);

  function update(id: number, nextStatus: CommissionStatus, message: string) {
    setItems((records) => records.map((record) => record.id === id ? { ...record, status: nextStatus } : record));
    setSelected((record) => record?.id === id ? { ...record, status: nextStatus } : record);
    setToast(message); window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <>
      <PageHeader title="تدقيق العمولات المالية" description="مطابقة إشعارات التحويل البنكي واعتماد عمولة المنصة البالغة 1%." />
      <div className="financial-summary">
        <article className="card"><small>عمولات مستحقة</small><strong>42,860 ر.س</strong><span>37 عملية غير مسددة</span></article>
        <article className="card"><small>بانتظار التدقيق</small><strong>8,240 ر.س</strong><span>8 إيصالات مرفوعة</span></article>
        <article className="card"><small>تم اعتمادها هذا الشهر</small><strong>128,200 ر.س</strong><span>96 عملية مكتملة</span></article>
      </div>
      <section className="card data-surface">
        <DataTable caption="قائمة سجلات العمولات" columns={columns} rows={rows} rowKey={(item) => item.id} emptyMessage="لا توجد عمولات مطابقة للفلاتر الحالية." pagination={{ page, pageSize: table.pageSize, total: visible.length, pageSizeOptions: table.pageSizeOptions }} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} toolbar={<div className="filters-row"><label className="field-with-icon"><Search size={16} /><input value={table.search} onChange={(event) => table.setSearch(event.target.value)} placeholder="بحث بالبائع أو الإعلان أو رقم العملية" aria-label="البحث في العمولات" /></label><select className="select-control" value={status} onChange={(event) => table.setFilter("status", event.target.value)} aria-label="تصفية حالة العمولة"><option value="all">كل الحالات</option><option value="paid">بانتظار التدقيق</option><option value="unpaid">غير مسدد</option><option value="verified">مسدد ومعتمد</option><option value="rejected">مرفوض</option></select></div>} />
      </section>

      <Drawer open={Boolean(selected)} title={selected ? `تدقيق الفاتورة #${selected.id}` : ""} onClose={() => setSelected(null)}>{selected && <div className="detail-stack">
        <div className="commission-amount"><FileCheck2 size={22} /><span><small>العمولة المطلوب مطابقتها</small><strong>{selected.amount.toLocaleString("ar-SA")} ر.س</strong></span><StatusBadge value={selected.status} /></div>
        <dl className="detail-grid"><div><dt>البائع</dt><dd>{selected.seller}</dd></div><div><dt>رقم الجوال</dt><dd dir="ltr">{selected.phone}</dd></div><div><dt>الإعلان</dt><dd>{selected.listing}</dd></div><div><dt>قيمة البيع</dt><dd>{selected.soldPrice.toLocaleString("ar-SA")} ر.س</dd></div><div><dt>البنك</dt><dd>{selected.bank}</dd></div><div><dt>مرجع العملية</dt><dd>{selected.reference}</dd></div></dl>
        {selected.receipt ? <figure className="receipt-preview"><figcaption>صورة إشعار التحويل</figcaption><img src={selected.receipt} alt="إشعار التحويل البنكي" /></figure> : <div className="empty-state-small">لم يرفع البائع إشعار التحويل بعد.</div>}
        {selected.status === "paid" && <div className="decision-actions"><AuthorizedButton resource="commissions" action="verify" className="button success-button" type="button" onClick={() => update(selected.id, "verified", "تم اعتماد السداد وتحديث ذمة البائع")}><Check size={17} />اعتماد السداد</AuthorizedButton><AuthorizedButton resource="commissions" action="reject" className="button danger-outline" type="button" onClick={() => setRejecting(selected)}><X size={17} />رفض الإشعار</AuthorizedButton></div>}
      </div>}</Drawer>
      <Modal open={Boolean(rejecting)} title="رفض إشعار التحويل" onClose={() => setRejecting(null)}><label className="form-field"><span>سبب الرفض</span><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="مثال: المبلغ لا يطابق العمولة المستحقة" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setRejecting(null)}>إلغاء</button><AuthorizedButton resource="commissions" action="reject" className="button danger-button" type="button" disabled={!reason.trim()} onClick={() => { if (rejecting) update(rejecting.id, "rejected", "تم رفض الإشعار وإرسال السبب للبائع"); setRejecting(null); setReason(""); }}>رفض الإشعار</AuthorizedButton></div></Modal>
      <Toast message={toast} />
    </>
  );
}
