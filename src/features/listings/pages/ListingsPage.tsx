import { Check, Eye, Pause, Play, Search, Trash2, Video, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Drawer } from "../../../components/ui/Drawer";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { initialListings, type Listing, type ListingStatus } from "../../../data/adminFixtures";

const filters: Array<{ label: string; value: "all" | ListingStatus }> = [
  { label: "الكل", value: "all" }, { label: "قيد المراجعة", value: "pending_review" }, { label: "نشط", value: "active" }, { label: "تم البيع", value: "sold" }, { label: "مرفوض", value: "rejected" },
];

export function ListingsPage() {
  const [listings, setListings] = useState(initialListings);
  const [status, setStatus] = useState<"all" | ListingStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");

  const visible = useMemo(() => listings.filter((listing) => {
    const matchesStatus = status === "all" || listing.status === status;
    const text = `${listing.title} ${listing.seller} ${listing.phone} ${listing.village}`.toLowerCase();
    return matchesStatus && text.includes(query.toLowerCase());
  }), [listings, query, status]);

  function updateStatus(id: number, nextStatus: ListingStatus, message: string) {
    setListings((items) => items.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
    setSelected((item) => item?.id === id ? { ...item, status: nextStatus } : item);
    setToast(message); window.setTimeout(() => setToast(""), 2600);
  }

  function reject() {
    if (!rejecting || !reason.trim()) return;
    updateStatus(rejecting.id, "rejected", "تم رفض الإعلان وإرسال السبب للمعلن");
    setRejecting(null); setReason("");
  }

  function removeListing(listing: Listing) {
    if (!window.confirm(`حذف الإعلان #${listing.id} نهائياً؟`)) return;
    setListings((items) => items.filter((item) => item.id !== listing.id));
    setSelected(null); setToast("تم حذف الإعلان من قائمة الإدارة");
  }

  return (
    <>
      <PageHeader title="مراجعة الإعلانات" description="مراقبة المحتوى واعتماد أو رفض الإعلانات قبل ظهورها في تطبيق الموبايل." />
      <section className="card data-surface">
        <div className="tabs-row">{filters.map((filter) => <button className={`tab-button ${status === filter.value ? "active" : ""}`} type="button" key={filter.value} onClick={() => setStatus(filter.value)}>{filter.label}<span>{filter.value === "all" ? listings.length : listings.filter((item) => item.status === filter.value).length}</span></button>)}</div>
        <div className="filters-row"><label className="field-with-icon"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالعنوان أو المعلن أو رقم الجوال" /></label><span className="record-count">{visible.length} إعلان</span></div>
        <div className="table-wrap"><table><thead><tr><th>الإعلان</th><th>المعلن</th><th>القسم والموقع</th><th>السعر</th><th>المشاهدات</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>
          {visible.map((listing) => <tr key={listing.id}><td><div className="record-primary"><img src={listing.image} alt="" /><span><strong>{listing.title}</strong><small>#{listing.id} · {listing.createdAt}</small></span></div></td><td><strong>{listing.seller}</strong><small className="block-copy" dir="ltr">{listing.phone}</small></td><td>{listing.category}<small className="block-copy">{listing.village}، {listing.region}</small></td><td className="numeric">{listing.price.toLocaleString("ar-SA")} ر.س</td><td className="numeric">{listing.views.toLocaleString("ar-SA")}</td><td><StatusBadge value={listing.status} /></td><td><AuthorizedButton resource="listings" action="show" className="icon-button table-action" type="button" onClick={() => setSelected(listing)} aria-label="عرض التفاصيل"><Eye size={17} /></AuthorizedButton></td></tr>)}
        </tbody></table></div>
        {!visible.length && <div className="empty">لا توجد إعلانات مطابقة للفلاتر الحالية.</div>}
      </section>

      <Drawer open={Boolean(selected)} title={selected ? `الإعلان #${selected.id}` : ""} onClose={() => setSelected(null)}>
        {selected && <div className="detail-stack">
          <div className="media-preview"><img src={selected.image} alt={selected.title} />{selected.hasVideo && <button type="button"><Video size={18} /> تشغيل الفيديو المضغوط</button>}</div>
          <div><div className="detail-title-row"><h3>{selected.title}</h3><StatusBadge value={selected.status} /></div><p className="muted">{selected.description}</p></div>
          <dl className="detail-grid"><div><dt>السعر</dt><dd>{selected.price.toLocaleString("ar-SA")} ر.س</dd></div><div><dt>القسم</dt><dd>{selected.category}</dd></div><div><dt>المعلن</dt><dd>{selected.seller}</dd></div><div><dt>الجوال</dt><dd dir="ltr">{selected.phone}</dd></div><div><dt>الموقع</dt><dd>{selected.village}، {selected.region}</dd></div><div><dt>المشاهدات</dt><dd>{selected.views}</dd></div></dl>
          <div className="decision-actions">
            {selected.status === "pending_review" && <><AuthorizedButton resource="listings" action="approve" className="button success-button" type="button" onClick={() => updateStatus(selected.id, "active", "تم اعتماد الإعلان وإرساله للنشر")}><Check size={17} />اعتماد الإعلان</AuthorizedButton><AuthorizedButton resource="listings" action="reject" className="button danger-outline" type="button" onClick={() => setRejecting(selected)}><X size={17} />رفض الإعلان</AuthorizedButton></>}
            {selected.status === "active" && <AuthorizedButton resource="listings" action="edit" className="button secondary" type="button" onClick={() => updateStatus(selected.id, "rejected", "تم إلغاء تنشيط الإعلان")}><Pause size={17} />إلغاء التنشيط</AuthorizedButton>}
            {selected.status === "rejected" && <AuthorizedButton resource="listings" action="edit" className="button secondary" type="button" onClick={() => updateStatus(selected.id, "active", "تمت إعادة تنشيط الإعلان")}><Play size={17} />إعادة التنشيط</AuthorizedButton>}
            <AuthorizedButton resource="listings" action="delete" className="button danger-ghost" type="button" onClick={() => removeListing(selected)}><Trash2 size={17} />حذف نهائي</AuthorizedButton>
          </div>
        </div>}
      </Drawer>
      <Modal open={Boolean(rejecting)} title="رفض الإعلان" onClose={() => setRejecting(null)}><label className="form-field"><span>سبب الرفض</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="">اختر سبباً</option><option>سلعة ممنوعة</option><option>صور غير لائقة</option><option>سعر وهمي</option><option>بيانات الإعلان غير مكتملة</option></select></label><label className="form-field"><span>ملاحظات إضافية</span><textarea rows={4} placeholder="ستظهر هذه الملاحظات للمعلن" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setRejecting(null)}>إلغاء</button><AuthorizedButton resource="listings" action="reject" className="button danger-button" type="button" disabled={!reason} onClick={reject}>رفض وإشعار المعلن</AuthorizedButton></div></Modal>
      <Toast message={toast} />
    </>
  );
}
