import { Check, Eye, FileCheck2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Drawer } from "../../../components/ui/Drawer";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { initialCommissions, type CommissionRecord, type CommissionStatus } from "../../../data/adminFixtures";

export function CommissionsPage() {
  const [items, setItems] = useState(initialCommissions);
  const [status, setStatus] = useState<"all" | CommissionStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CommissionRecord | null>(null);
  const [rejecting, setRejecting] = useState<CommissionRecord | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const visible = useMemo(() => items.filter((item) => (status === "all" || item.status === status) && `${item.seller} ${item.phone} ${item.listing} ${item.reference}`.toLowerCase().includes(query.toLowerCase())), [items, query, status]);

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
        <div className="filters-row"><label className="field-with-icon"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالبائع أو الإعلان أو رقم العملية" /></label><select className="select-control" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">كل الحالات</option><option value="paid">بانتظار التدقيق</option><option value="unpaid">غير مسدد</option><option value="verified">مسدد ومعتمد</option><option value="rejected">مرفوض</option></select></div>
        <div className="table-wrap"><table><thead><tr><th>البائع</th><th>الإعلان المباع</th><th>قيمة البيع</th><th>العمولة 1%</th><th>مرجع التحويل</th><th>الحالة</th><th>التدقيق</th></tr></thead><tbody>
          {visible.map((item) => <tr key={item.id}><td><strong>{item.seller}</strong><small className="block-copy" dir="ltr">{item.phone}</small></td><td>{item.listing}<small className="block-copy">فاتورة #{item.id}</small></td><td className="numeric">{item.soldPrice.toLocaleString("ar-SA")} ر.س</td><td className="numeric emphasis">{item.amount.toLocaleString("ar-SA")} ر.س</td><td>{item.reference}</td><td><StatusBadge value={item.status} /></td><td><button className="icon-button table-action" type="button" onClick={() => setSelected(item)} aria-label="تدقيق العمولة"><Eye size={17} /></button></td></tr>)}
        </tbody></table></div>
      </section>

      <Drawer open={Boolean(selected)} title={selected ? `تدقيق الفاتورة #${selected.id}` : ""} onClose={() => setSelected(null)}>{selected && <div className="detail-stack">
        <div className="commission-amount"><FileCheck2 size={22} /><span><small>العمولة المطلوب مطابقتها</small><strong>{selected.amount.toLocaleString("ar-SA")} ر.س</strong></span><StatusBadge value={selected.status} /></div>
        <dl className="detail-grid"><div><dt>البائع</dt><dd>{selected.seller}</dd></div><div><dt>رقم الجوال</dt><dd dir="ltr">{selected.phone}</dd></div><div><dt>الإعلان</dt><dd>{selected.listing}</dd></div><div><dt>قيمة البيع</dt><dd>{selected.soldPrice.toLocaleString("ar-SA")} ر.س</dd></div><div><dt>البنك</dt><dd>{selected.bank}</dd></div><div><dt>مرجع العملية</dt><dd>{selected.reference}</dd></div></dl>
        {selected.receipt ? <figure className="receipt-preview"><figcaption>صورة إشعار التحويل</figcaption><img src={selected.receipt} alt="إشعار التحويل البنكي" /></figure> : <div className="empty-state-small">لم يرفع البائع إشعار التحويل بعد.</div>}
        {selected.status === "paid" && <div className="decision-actions"><button className="button success-button" type="button" onClick={() => update(selected.id, "verified", "تم اعتماد السداد وتحديث ذمة البائع")}><Check size={17} />اعتماد السداد</button><button className="button danger-outline" type="button" onClick={() => setRejecting(selected)}><X size={17} />رفض الإشعار</button></div>}
      </div>}</Drawer>
      <Modal open={Boolean(rejecting)} title="رفض إشعار التحويل" onClose={() => setRejecting(null)}><label className="form-field"><span>سبب الرفض</span><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="مثال: المبلغ لا يطابق العمولة المستحقة" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setRejecting(null)}>إلغاء</button><button className="button danger-button" type="button" disabled={!reason.trim()} onClick={() => { if (rejecting) update(rejecting.id, "rejected", "تم رفض الإشعار وإرسال السبب للبائع"); setRejecting(null); setReason(""); }}>رفض الإشعار</button></div></Modal>
      <Toast message={toast} />
    </>
  );
}
