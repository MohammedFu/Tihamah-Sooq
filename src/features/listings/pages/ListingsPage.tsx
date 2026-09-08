import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, ImageOff, Info, Pause, Play, Search, Trash2, Video, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Drawer } from "../../../components/ui/Drawer";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { FormDialog, SelectField, SubmitButton, TextareaField, ValidatedForm } from "../../../components/ui/forms";
import { useAdminNotification } from "../../../providers/notificationStore";
import { isApiError } from "../../../services/http";
import type { Listing, ListingMedia, ListingStatus } from "../../../types/domain";
import { useListings } from "../api/useListings";
import { listingRejectionSchema, type ListingRejectionValues } from "../schemas/listingModerationSchema";

const statusFilters: Array<{ label: string; value: ListingStatus }> = [
  { label: "قيد المراجعة", value: "pending_review" },
  { label: "نشط", value: "active" },
  { label: "تم البيع", value: "sold" },
  { label: "مرفوض", value: "rejected" },
];
const moneyFormatter = new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" });

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "غير متاح" : dateFormatter.format(date);
}

function primaryImage(listing: Listing) {
  return [...listing.media].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)).find((item) => item.type === "image") ?? null;
}

function ListingThumbnail({ listing }: { listing: Listing }) {
  const media = primaryImage(listing);
  const [failed, setFailed] = useState(false);
  if (!media || failed) return <span className="record-media-fallback" aria-hidden="true"><ImageOff size={18} /></span>;
  return <img src={media.url} alt="" onError={() => setFailed(true)} />;
}

function listingColumns(onSelect: (listing: Listing) => void): DataTableColumn<Listing>[] {
  return [
    { id: "listing", header: "الإعلان", cell: (listing) => <div className="record-primary"><ListingThumbnail key={primaryImage(listing)?.url} listing={listing} /><span><strong>{listing.title}</strong><small><bdi dir="ltr">#{listing.id}</bdi> · {formatDate(listing.createdAt)}</small></span></div> },
    { id: "seller", header: "المعلن", cell: (listing) => <><strong>{listing.seller?.fullName ?? "معلن غير متاح"}</strong><small className="block-copy" dir="ltr">{listing.seller?.phone ?? "—"}</small></> },
    { id: "location", header: "القسم والموقع", cell: (listing) => <>{listing.category?.name ?? "قسم غير متاح"}<small className="block-copy">{listing.village?.name ?? "قرية غير متاحة"}، {listing.region?.name ?? "منطقة غير متاحة"}</small></> },
    { id: "price", header: "السعر", sortable: true, className: "numeric", cell: (listing) => moneyFormatter.format(listing.price) },
    { id: "views", header: "المشاهدات", className: "numeric", cell: (listing) => listing.viewCount === null ? "غير متاح" : listing.viewCount.toLocaleString("ar-SA") },
    { id: "status", header: "الحالة", cell: (listing) => <StatusBadge value={listing.status} /> },
    { id: "action", header: "الإجراء", cell: (listing) => <AuthorizedButton resource="listings" action="show" className="icon-button table-action" type="button" onClick={() => onSelect(listing)} aria-label={`عرض تفاصيل الإعلان ${listing.id}`} title="عرض التفاصيل"><Eye aria-hidden="true" size={17} /></AuthorizedButton> },
  ];
}

function MediaItem({ media, title }: { media: ListingMedia; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="media-fallback" role="status"><ImageOff aria-hidden="true" size={24} /><span>تعذر تحميل {media.type === "video" ? "الفيديو" : "الصورة"}.</span></div>;
  if (media.type === "video") return <video controls preload="metadata" aria-label={`فيديو الإعلان: ${title}`} onError={() => setFailed(true)}><source src={media.url} /></video>;
  return <img src={media.url} alt={`صورة الإعلان: ${title}`} onError={() => setFailed(true)} />;
}

function ListingMediaGallery({ listing }: { listing: Listing }) {
  const media = [...listing.media].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
  if (!media.length) return <div className="media-fallback" role="status"><ImageOff aria-hidden="true" size={24} /><span>لا توجد وسائط مرفقة بهذا الإعلان.</span></div>;
  return <div className="listing-media-gallery">{media.map((item) => <figure key={item.id}><MediaItem media={item} title={listing.title} />{item.type === "video" && <figcaption><Video aria-hidden="true" size={15} /> فيديو الإعلان</figcaption>}</figure>)}</div>;
}

function errorMessage(error: unknown) {
  return isApiError(error) ? error.userMessage : "تعذر حفظ القرار. حدّث البيانات وحاول مجدداً.";
}

export function ListingsPage() {
  const table = useDataTableUrlState<"status">({ filters: [{ name: "status", defaultValue: "pending_review", values: statusFilters.map((filter) => filter.value) }], sortableFields: ["price"], defaultPageSize: 10, pageSizeOptions: [10, 20, 50] });
  const status = table.filters.status as ListingStatus;
  const deferredSearch = useDeferredValue(table.search);
  const api = useListings({ page: table.page, pageSize: table.pageSize, status, search: deferredSearch, sort: table.sort });
  const [selected, setSelected] = useState<Listing | null>(null);
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState<Listing | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const notification = useAdminNotification();
  const rejectionForm = useForm<ListingRejectionValues>({ resolver: zodResolver(listingRejectionSchema), defaultValues: { reason: "", notes: "" } });
  const rows = api.list.result.data;
  const total = api.list.result.total ?? 0;
  const pending = api.update.mutation.isPending || api.remove.mutation.isPending;
  const columns = useMemo(() => listingColumns((listing) => { setSelected(listing); setActionError(null); }), []);

  async function moderate(listing: Listing, nextStatus: "active" | "rejected", reason?: string) {
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.moderate(listing.id, { status: nextStatus, ...(reason ? { reason } : {}) }),
        {
          key: `listing-${listing.id}-status`,
          progress: "جارٍ حفظ قرار مراجعة الإعلان…",
          success: nextStatus === "active" ? "تم اعتماد حالة الإعلان بعد تأكيد الخادم." : "تم رفض الإعلان؛ سبب القرار غير محفوظ لأن العقد الحالي لا يقبله.",
          error: errorMessage,
        },
      );
      setSelected((current) => current?.id === listing.id ? { ...current, status: nextStatus } : current);
      setRejecting(null);
      rejectionForm.reset();
    } catch (error) {
      setActionError(error);
    }
  }

  function openRejection(listing: Listing) {
    rejectionForm.reset({ reason: "", notes: "" });
    setRejecting(listing);
  }

  async function reject(values: ListingRejectionValues) {
    if (!rejecting) return;
    const localReason = values.notes ? `${values.reason}: ${values.notes}` : values.reason;
    await moderate(rejecting, "rejected", localReason);
  }

  async function deleteListing() {
    if (!deleting) return;
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.delete(deleting.id),
        { key: `listing-${deleting.id}-delete`, progress: "جارٍ إخفاء الإعلان…", success: "تم إخفاء الإعلان بعد تأكيد الخادم.", error: errorMessage },
      );
      setDeleting(null);
      setSelected(null);
    } catch (error) {
      setActionError(error);
    }
  }

  return (
    <>
      <PageHeader title="مراجعة الإعلانات" description="مراجعة تفاصيل الإعلانات ووسائطها، ثم اعتماد الحالة المؤكدة من الخادم." />
      <section className="card data-surface">
        <div className="tabs-row" role="group" aria-label="تصفية الإعلانات حسب الحالة">{statusFilters.map((filter) => <button className={`tab-button ${status === filter.value ? "active" : ""}`} type="button" key={filter.value} aria-pressed={status === filter.value} onClick={() => table.setFilter("status", filter.value)}>{filter.label}</button>)}</div>
        <p className="contract-note listing-contract-note"><Info aria-hidden="true" size={15} />يعرض الخادم حالة واحدة في كل مرة؛ لا يوفر عقده الحالي تجميع «كل الحالات» في طلب موثوق.</p>
        <DataTable
          caption="قائمة الإعلانات الإدارية"
          columns={columns}
          rows={rows}
          rowKey={(listing) => listing.id}
          loading={api.list.query.isPending}
          error={api.list.query.isError ? api.list.query.error : undefined}
          onRetry={() => { void api.list.query.refetch(); }}
          retrying={api.list.query.isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          emptyMessage="لا توجد إعلانات مطابقة للحالة والبحث الحاليين."
          pagination={{ page: table.page, pageSize: table.pageSize, total, pageSizeOptions: table.pageSizeOptions }}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
          toolbar={<div className="filters-row"><label className="field-with-icon"><Search aria-hidden="true" size={16} /><input value={table.search} onChange={(event) => table.setSearch(event.target.value)} placeholder="بحث بعنوان الإعلان أو وصفه" aria-label="البحث في الإعلانات" /></label><span className="record-count">{total.toLocaleString("ar-SA")} إعلان</span></div>}
        />
      </section>

      <Drawer open={Boolean(selected)} title={selected ? `الإعلان #${selected.id}` : ""} onClose={() => { if (!pending) setSelected(null); }}>
        {selected && <div className="detail-stack">
          <ListingMediaGallery listing={selected} />
          <div><div className="detail-title-row"><h3>{selected.title}</h3><StatusBadge value={selected.status} /></div><p className="muted">{selected.description}</p></div>
          <dl className="detail-grid"><div><dt>السعر</dt><dd>{moneyFormatter.format(selected.price)}</dd></div><div><dt>القسم</dt><dd>{selected.category?.name ?? "غير متاح"}</dd></div><div><dt>المعلن</dt><dd>{selected.seller?.fullName ?? "غير متاح"}</dd></div><div><dt>الجوال</dt><dd dir="ltr">{selected.seller?.phone ?? "—"}</dd></div><div><dt>الموقع</dt><dd>{selected.village?.name ?? "قرية غير متاحة"}، {selected.region?.name ?? "منطقة غير متاحة"}</dd></div><div><dt>المشاهدات</dt><dd>{selected.viewCount === null ? "غير متاح" : selected.viewCount.toLocaleString("ar-SA")}</dd></div><div><dt>تاريخ النشر</dt><dd>{formatDate(selected.createdAt)}</dd></div><div><dt>آخر تحديث</dt><dd>{selected.updatedAt ? formatDate(selected.updatedAt) : "غير متاح"}</dd></div></dl>
          {Boolean(actionError) && <div className="alert-box danger" role="alert"><Info aria-hidden="true" size={18} /><p><strong>لم يُحفظ القرار</strong>{errorMessage(actionError)}</p></div>}
          <div className="decision-actions">
            {selected.status === "pending_review" && <><AuthorizedButton resource="listings" action="approve" className="button success-button" type="button" disabled={pending} aria-busy={pending} onClick={() => { void moderate(selected, "active"); }}><Check aria-hidden="true" size={17} />اعتماد الإعلان</AuthorizedButton><AuthorizedButton resource="listings" action="reject" className="button danger-outline" type="button" disabled={pending} onClick={() => openRejection(selected)}><X aria-hidden="true" size={17} />رفض الإعلان</AuthorizedButton></>}
            {selected.status === "active" && <AuthorizedButton resource="listings" action="reject" className="button secondary" type="button" disabled={pending} onClick={() => openRejection(selected)}><Pause aria-hidden="true" size={17} />رفض وإيقاف الإعلان</AuthorizedButton>}
            {selected.status === "rejected" && <AuthorizedButton resource="listings" action="approve" className="button secondary" type="button" disabled={pending} aria-busy={pending} onClick={() => { void moderate(selected, "active"); }}><Play aria-hidden="true" size={17} />إعادة تنشيط الإعلان</AuthorizedButton>}
            <AuthorizedButton resource="listings" action="delete" className="button danger-ghost" type="button" disabled={pending} onClick={() => setDeleting(selected)}><Trash2 aria-hidden="true" size={17} />إخفاء الإعلان</AuthorizedButton>
          </div>
        </div>}
      </Drawer>

      <FormDialog open={Boolean(rejecting)} title="رفض أو إيقاف الإعلان" dirty={rejectionForm.formState.isDirty} submitting={pending} onClose={() => { setRejecting(null); rejectionForm.reset(); }}>
        {(requestClose) => <ValidatedForm className="validated-form" onSubmit={rejectionForm.handleSubmit((values) => { void reject(values); })}>
          <SelectField label="سبب القرار" error={rejectionForm.formState.errors.reason?.message} {...rejectionForm.register("reason")}>
            <option value="">اختر سبباً</option><option value="سلعة ممنوعة">سلعة ممنوعة</option><option value="صور غير لائقة">صور غير لائقة</option><option value="سعر وهمي">سعر وهمي</option><option value="بيانات الإعلان غير مكتملة">بيانات الإعلان غير مكتملة</option>
          </SelectField>
          <TextareaField label="ملاحظات إضافية" rows={4} placeholder="ملاحظات فريق المراجعة" error={rejectionForm.formState.errors.notes?.message} {...rejectionForm.register("notes")} />
          <div className="alert-box"><Info aria-hidden="true" size={18} /><p><strong>فجوة في عقد الخادم</strong>سبب القرار مطلوب للتأكيد هنا، لكن واجهة الخادم الحالية تقبل الحالة فقط؛ لن تدّعي اللوحة حفظ السبب أو إرساله للمعلن.</p></div>
          <div className="modal-actions"><button className="button secondary" type="button" disabled={pending} onClick={requestClose}>إلغاء</button><SubmitButton className="button danger-button" pending={pending} pendingLabel="جارٍ حفظ القرار…">تأكيد الرفض</SubmitButton></div>
        </ValidatedForm>}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="إخفاء الإعلان"
        intent="danger"
        icon={<Trash2 aria-hidden="true" size={22} />}
        entityName={deleting?.title}
        entityType="الإعلان"
        description="سيُحذف الإعلان حذفاً لطيفاً ويختفي من القوائم العامة. لا يؤكد العقد الحالي إمكانية استعادته من لوحة التحكم."
        confirmLabel="تأكيد الإخفاء"
        pendingLabel="جارٍ الإخفاء…"
        submitting={pending}
        resource="listings"
        action="delete"
        onConfirm={() => deleteListing()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
