import { Check, Eye, Pause, Play, Search, Trash2, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "../../../components/ui/Drawer";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { initialListings, type Listing, type ListingStatus } from "../../../data/adminFixtures";
import { useAdminNotification } from "../../../providers/notificationStore";

const filters: Array<{ label: string; value: "all" | ListingStatus }> = [
  { label: "الكل", value: "all" }, { label: "قيد المراجعة", value: "pending_review" }, { label: "نشط", value: "active" }, { label: "تم البيع", value: "sold" }, { label: "مرفوض", value: "rejected" },
];

function listingColumns(onSelect: (listing: Listing) => void): DataTableColumn<Listing>[] {
  return [
    { id: "listing", header: "الإعلان", cell: (listing) => <div className="record-primary"><img src={listing.image} alt="" /><span><strong>{listing.title}</strong><small>#{listing.id} · {listing.createdAt}</small></span></div> },
    { id: "seller", header: "المعلن", cell: (listing) => <><strong>{listing.seller}</strong><small className="block-copy" dir="ltr">{listing.phone}</small></> },
    { id: "location", header: "القسم والموقع", cell: (listing) => <>{listing.category}<small className="block-copy">{listing.village}، {listing.region}</small></> },
    { id: "price", header: "السعر", sortable: true, className: "numeric", cell: (listing) => <>{listing.price.toLocaleString("ar-SA")} ر.س</> },
    { id: "views", header: "المشاهدات", sortable: true, className: "numeric", cell: (listing) => listing.views.toLocaleString("ar-SA") },
    { id: "status", header: "الحالة", cell: (listing) => <StatusBadge value={listing.status} /> },
    { id: "action", header: "الإجراء", cell: (listing) => <AuthorizedButton resource="listings" action="show" className="icon-button table-action" type="button" onClick={() => onSelect(listing)} aria-label="عرض التفاصيل" title="عرض التفاصيل"><Eye size={17} /></AuthorizedButton> },
  ];
}

export function ListingsPage() {
  const [listings, setListings] = useState(initialListings);
  const table = useDataTableUrlState<"status">({ filters: [{ name: "status", defaultValue: "all", values: filters.map((filter) => filter.value) }], sortableFields: ["price", "views"], defaultPageSize: 10, pageSizeOptions: [10, 20, 50] });
  const status = table.filters.status as "all" | ListingStatus;
  const [selected, setSelected] = useState<Listing | null>(null);
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [reason, setReason] = useState("");
  const notification = useAdminNotification();

  const visible = useMemo(() => listings.filter((listing) => {
    const matchesStatus = status === "all" || listing.status === status;
    const text = `${listing.title} ${listing.seller} ${listing.phone} ${listing.village}`.toLowerCase();
    return matchesStatus && text.includes(table.search.toLowerCase());
  }).sort((left, right) => table.sort ? (left[table.sort.field as "price" | "views"] - right[table.sort.field as "price" | "views"]) * (table.sort.order === "asc" ? 1 : -1) : right.id - left.id), [listings, status, table.search, table.sort]);
  const totalPages = Math.max(1, Math.ceil(visible.length / table.pageSize));
  const page = Math.min(table.page, totalPages);
  const rows = visible.slice((page - 1) * table.pageSize, page * table.pageSize);
  const columns = useMemo(() => listingColumns(setSelected), []);
  useEffect(() => { if (table.page > totalPages) table.setPage(totalPages); }, [table.page, totalPages]);

  function updateStatus(id: number, nextStatus: ListingStatus, message: string) {
    setListings((items) => items.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
    setSelected((item) => item?.id === id ? { ...item, status: nextStatus } : item);
    notification.success(message);
  }

  function reject() {
    if (!rejecting || !reason.trim()) return;
    updateStatus(rejecting.id, "rejected", "تم رفض الإعلان وإرسال السبب للمعلن");
    setRejecting(null); setReason("");
  }

  function removeListing(listing: Listing) {
    if (!window.confirm(`حذف الإعلان #${listing.id} نهائياً؟`)) return;
    setListings((items) => items.filter((item) => item.id !== listing.id));
    setSelected(null); notification.success("تم حذف الإعلان من قائمة الإدارة");
  }

  return (
    <>
      <PageHeader title="مراجعة الإعلانات" description="مراقبة المحتوى واعتماد أو رفض الإعلانات قبل ظهورها في تطبيق الموبايل." />
      <section className="card data-surface">
        <div className="tabs-row">{filters.map((filter) => <button className={`tab-button ${status === filter.value ? "active" : ""}`} type="button" key={filter.value} onClick={() => table.setFilter("status", filter.value)}>{filter.label}<span>{filter.value === "all" ? listings.length : listings.filter((item) => item.status === filter.value).length}</span></button>)}</div>
        <DataTable caption="قائمة الإعلانات الإدارية" columns={columns} rows={rows} rowKey={(listing) => listing.id} sort={table.sort} onSortChange={table.setSort} emptyMessage="لا توجد إعلانات مطابقة للفلاتر الحالية." pagination={{ page, pageSize: table.pageSize, total: visible.length, pageSizeOptions: table.pageSizeOptions }} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} toolbar={<div className="filters-row"><label className="field-with-icon"><Search size={16} /><input value={table.search} onChange={(event) => table.setSearch(event.target.value)} placeholder="بحث بالعنوان أو المعلن أو رقم الجوال" aria-label="البحث في الإعلانات" /></label><span className="record-count">{visible.length} إعلان</span></div>} />
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
    </>
  );
}
