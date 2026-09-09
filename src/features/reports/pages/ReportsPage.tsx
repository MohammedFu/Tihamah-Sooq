import { zodResolver } from "@hookform/resolvers/zod";
import { useGetIdentity } from "@refinedev/core";
import {
  Ban,
  CheckCircle2,
  Eye,
  Flag,
  Info,
  Search,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Drawer } from "../../../components/ui/Drawer";
import { FormDialog, SubmitButton, TextareaField, ValidatedForm } from "../../../components/ui/forms";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SensitiveValue } from "../../../components/ui/SensitiveValue";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAdminNotification } from "../../../providers/notificationStore";
import { isApiError } from "../../../services/http";
import type { AdminAccountIdentity, Report, ReportStatus, ReportType, User } from "../../../types/domain";
import { useDashboardMetrics } from "../../dashboard/api/useDashboardMetrics";
import { useReports } from "../api/useReports";
import {
  REPORT_RESOLUTION_ACTION_LABELS,
  reportResolutionSchema,
  type ReportResolutionAction,
  type ReportResolutionFormValues,
} from "../schemas/reportResolutionSchema";
import {
  formatReportDate,
  reportTypeBadgeClass,
  reportTypeLabel,
} from "../utils/reportHelpers";

const statusFilters: Array<{ label: string; value: "all" | ReportStatus }> = [
  { label: "مفتوحة", value: "open" },
  { label: "مغلقة", value: "resolved" },
  { label: "الكل", value: "all" },
];

const typeFilterOptions: Array<{ label: string; value: "all" | ReportType }> = [
  { label: "كل أنواع البلاغات", value: "all" },
  { label: "احتيال ونصب", value: "fraud" },
  { label: "معلومات مضللة", value: "misleading" },
  { label: "سلعة مباعة مسبقاً", value: "sold" },
  { label: "محتوى أو سلعة ممنوعة", value: "prohibited" },
  { label: "أخرى", value: "other" },
];

const currencyFormatter = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 2,
});

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "غير متاح";
  return currencyFormatter.format(amount);
}

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.userMessage : "تعذر تنفيذ الإجراء، يرجى المحاولة لاحقاً.";
}

function reportColumns(onSelect: (report: Report) => void): DataTableColumn<Report>[] {
  return [
    {
      id: "id",
      header: "رقم البلاغ",
      className: "numeric",
      cell: (report) => <bdi dir="ltr">#{report.id}</bdi>,
    },
    {
      id: "type",
      header: "نوع البلاغ",
      cell: (report) => (
        <span className={reportTypeBadgeClass(report.type)}>
          <Flag aria-hidden="true" size={13} />
          {reportTypeLabel(report.type)}
        </span>
      ),
    },
    {
      id: "reporter",
      header: "مقدم البلاغ",
      cell: (report) => (
        <>
          <strong>{report.reporter?.fullName ?? `مستخدم #${report.reporterId}`}</strong>
          <small className="block-copy">
            <SensitiveValue value={report.reporter?.phone} type="phone" resource="reports" action="show" label="رقم جوال المبلّغ" />
          </small>
        </>
      ),
    },
    {
      id: "listing",
      header: "الإعلان المرتبط",
      cell: (report) => (
        <>
          {report.listing?.title ?? (report.listingId ? `إعلان #${report.listingId}` : "غير مرتبط بإعلان")}
          {report.listing?.price !== undefined && (
            <small className="block-copy">{formatCurrency(report.listing.price)}</small>
          )}
        </>
      ),
    },
    {
      id: "accused",
      header: "المعلن عنه",
      cell: (report) => {
        const seller = report.listing?.seller;
        if (!seller) return <span className="muted">غير متوفر</span>;
        return (
          <>
            <strong>{seller.fullName}</strong>
            <small className="block-copy">
              <SensitiveValue value={seller.phone} type="phone" resource="reports" action="show" label="رقم جوال المعلن" />
            </small>
          </>
        );
      },
    },
    {
      id: "createdAt",
      header: "تاريخ البلاغ",
      cell: (report) => formatReportDate(report.createdAt),
    },
    {
      id: "status",
      header: "الحالة",
      cell: (report) => <StatusBadge value={report.status} />,
    },
    {
      id: "action",
      header: "الإجراء",
      cell: (report) => (
        <AuthorizedButton
          resource="reports"
          action="show"
          className="icon-button table-action"
          type="button"
          onClick={() => onSelect(report)}
          aria-label={`عرض تفاصيل البلاغ ${report.id}`}
          title="عرض البلاغ"
        >
          <Eye aria-hidden="true" size={17} />
        </AuthorizedButton>
      ),
    },
  ];
}

export function ReportsPage() {
  const table = useDataTableUrlState<"status">({
    filters: [
      {
        name: "status",
        defaultValue: "open",
        values: statusFilters.map((filter) => filter.value),
      },
    ],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  });
  const status = table.filters.status as "all" | ReportStatus;
  const [selectedType, setSelectedType] = useState<"all" | ReportType>("all");
  const deferredSearch = useDeferredValue(table.search);

  const api = useReports({
    page: table.page,
    pageSize: table.pageSize,
    status,
  });

  const { data: currentAdmin } = useGetIdentity<AdminAccountIdentity>();
  const { query: dashboardQuery } = useDashboardMetrics();
  const metrics = dashboardQuery.data?.data;

  const [selected, setSelected] = useState<Report | null>(null);
  const [activeAction, setActiveAction] = useState<ReportResolutionAction | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const notification = useAdminNotification();

  const resolutionForm = useForm<ReportResolutionFormValues>({
    resolver: zodResolver(reportResolutionSchema),
    defaultValues: { action: "dismiss", notes: "" },
  });

  const rows = useMemo(() => api.list.result.data ?? [], [api.list.result.data]);
  const total = api.list.result.total ?? 0;
  const pending = api.isMutating;

  const visibleRows = useMemo(() => {
    return rows.filter((report) => {
      if (selectedType !== "all" && report.type !== selectedType) return false;
      if (!deferredSearch.trim()) return true;
      const query = deferredSearch.trim().toLowerCase();
      const reporterName = report.reporter?.fullName?.toLowerCase() ?? "";
      const reporterPhone = report.reporter?.phone?.toLowerCase() ?? "";
      const sellerName = report.listing?.seller?.fullName?.toLowerCase() ?? "";
      const sellerPhone = report.listing?.seller?.phone?.toLowerCase() ?? "";
      const listingTitle = report.listing?.title?.toLowerCase() ?? "";
      const reason = report.reason.toLowerCase();
      const idStr = String(report.id);
      return (
        reporterName.includes(query) ||
        reporterPhone.includes(query) ||
        sellerName.includes(query) ||
        sellerPhone.includes(query) ||
        listingTitle.includes(query) ||
        reason.includes(query) ||
        idStr.includes(query)
      );
    });
  }, [rows, selectedType, deferredSearch]);

  const columns = useMemo(
    () =>
      reportColumns((report) => {
        setSelected(report);
        setActionError(null);
      }),
    [],
  );

  function isSelfAdmin(user: User | null | undefined): boolean {
    if (!user || !currentAdmin) return false;
    const matchId = user.id === currentAdmin.id;
    const matchPhone = Boolean(user.phone && currentAdmin.phone && user.phone === currentAdmin.phone);
    return matchId || matchPhone;
  }

  function openResolutionDialog(action: ReportResolutionAction) {
    resolutionForm.reset({ action, notes: "" });
    setActiveAction(action);
    setActionError(null);
  }

  async function handleResolveSubmit(values: ReportResolutionFormValues) {
    if (!selected || !activeAction) return;
    setActionError(null);

    try {
      if (activeAction === "dismiss") {
        await notification.trackPromise(
          () => api.resolve(selected.id, values.notes),
          {
            key: `report-${selected.id}-resolve`,
            progress: "جارٍ إغلاق البلاغ وتوثيق القرار…",
            success: "تم إغلاق البلاغ وتوثيق القرار في سجل التدقيق بنجاح.",
            error: errorMessage,
          },
        );
      } else if (activeAction === "delete_listing") {
        const listingId = selected.listingId ?? selected.listing?.id;
        if (!listingId) throw new Error("لا يوجد إعلان مرتبط بهذا البلاغ لحذفه.");
        await notification.trackPromise(
          () => api.resolveAndDeleteListing(selected.id, Number(listingId), values.notes),
          {
            key: `report-${selected.id}-delete`,
            progress: "جارٍ إخفاء الإعلان المخالف وإغلاق البلاغ…",
            success: "تم إخفاء الإعلان المخالف وإغلاق البلاغ بنجاح بعد تأكيد الخادم.",
            error: errorMessage,
          },
        );
      } else if (activeAction === "ban_user") {
        const seller = selected.listing?.seller;
        const sellerId = selected.listing?.sellerId ?? seller?.id;
        if (!sellerId) throw new Error("لا يوجد معلن مرتبط بهذا البلاغ لحظره.");
        if (isSelfAdmin(seller)) throw new Error("لا يمكنك حظر حسابك الإداري الخاص.");
        await notification.trackPromise(
          () => api.resolveAndBanUser(selected.id, Number(sellerId), values.notes),
          {
            key: `report-${selected.id}-ban`,
            progress: "جارٍ حظر المعلن المخالف وإغلاق البلاغ…",
            success: "تم حظر المعلن المخالف وإنهاء جلساته وإغلاق البلاغ بنجاح.",
            error: errorMessage,
          },
        );
      }

      setSelected((current) =>
        current?.id === selected.id
          ? { ...current, status: "resolved", resolutionNotes: values.notes }
          : current,
      );
      setActiveAction(null);
      resolutionForm.reset();
    } catch (error) {
      setActionError(error);
    }
  }

  const accusedSeller = selected?.listing?.seller;
  const isAccusedSelf = isSelfAdmin(accusedSeller);

  return (
    <>
      <PageHeader
        title="البلاغات ومكافحة الاحتيال"
        description="مراجعة بلاغات المستخدمين واتخاذ إجراءات موثقة ضد الإعلانات والحسابات المخالفة."
      />

      <div className="summary-strip">
        <span>
          <strong>{(metrics?.openReports ?? rows.filter((r) => r.status === "open").length).toLocaleString("ar-SA")}</strong>{" "}
          بلاغات مفتوحة
        </span>
        <span>
          <strong>{rows.filter((r) => r.type === "fraud" && r.status === "open").length.toLocaleString("ar-SA")}</strong>{" "}
          عالية الأولوية (احتيال)
        </span>
        <span>
          <strong>{rows.filter((r) => r.status === "resolved").length.toLocaleString("ar-SA")}</strong>{" "}
          مغلقة في هذه القائمة
        </span>
      </div>

      <section className="card data-surface">
        <div className="tabs-row" role="group" aria-label="تصفية البلاغات حسب الحالة">
          {statusFilters.map((filter) => (
            <button
              className={`tab-button ${status === filter.value ? "active" : ""}`}
              aria-pressed={status === filter.value}
              onClick={() => table.setFilter("status", filter.value)}
              type="button"
              key={filter.value}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <DataTable
          caption="قائمة بلاغات الاحتيال والمحتوى"
          columns={columns}
          rows={visibleRows}
          rowKey={(report) => report.id}
          loading={api.list.query.isPending}
          error={api.list.query.error}
          onRetry={() => {
            void api.list.query.refetch();
          }}
          retrying={api.list.query.isFetching}
          emptyMessage="لا توجد بلاغات مطابقة للفلاتر الحالية."
          pagination={{
            page: table.page,
            pageSize: table.pageSize,
            total,
            pageSizeOptions: table.pageSizeOptions,
          }}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
          toolbar={
            <div className="filters-row">
              <label className="field-with-icon">
                <Search aria-hidden="true" size={16} />
                <input
                  value={table.search}
                  onChange={(event) => table.setSearch(event.target.value)}
                  placeholder="بحث في البلاغات، الأطراف، أو الإعلانات"
                  aria-label="البحث في البلاغات"
                />
              </label>

              <select
                className="select-control"
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value as "all" | ReportType)}
                aria-label="تصفية نوع البلاغ"
              >
                {typeFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <span className="record-count">{total.toLocaleString("ar-SA")} بلاغ</span>
            </div>
          }
        />
      </section>

      <Drawer
        open={Boolean(selected)}
        title={selected ? `البلاغ #${selected.id}` : ""}
        onClose={() => {
          if (!pending) setSelected(null);
        }}
      >
        {selected && (
          <div className="detail-stack">
            <div className="detail-title-row">
              <span className={reportTypeBadgeClass(selected.type)}>
                <Flag aria-hidden="true" size={14} />
                {reportTypeLabel(selected.type)}
              </span>
              <StatusBadge value={selected.status} />
            </div>

            <div className="report-note">
              <small>ملاحظات وتفاصيل البلاغ (من قِبل المبلّغ)</small>
              <p>{selected.reason}</p>
            </div>

            <dl className="detail-grid">
              <div>
                <dt>مقدم البلاغ</dt>
                <dd>{selected.reporter?.fullName ?? `مستخدم #${selected.reporterId}`}</dd>
              </div>
              <div>
                <dt>جوال مقدم البلاغ</dt>
                <dd>
                  <SensitiveValue value={selected.reporter?.phone} type="phone" resource="reports" action="show" label="رقم جوال المبلّغ" />
                </dd>
              </div>
              <div>
                <dt>المستخدم المبلغ عنه</dt>
                <dd>
                  {accusedSeller ? (
                    <span>
                      {accusedSeller.fullName}
                      {accusedSeller.isBanned && (
                        <span className="badge danger" style={{ marginRight: 6 }}>
                          محظور
                        </span>
                      )}
                    </span>
                  ) : (
                    "غير متوفر"
                  )}
                </dd>
              </div>
              <div>
                <dt>جوال المبلغ عنه</dt>
                <dd>
                  <SensitiveValue value={accusedSeller?.phone} type="phone" resource="reports" action="show" label="رقم جوال المعلن" />
                </dd>
              </div>
              <div>
                <dt>الإعلان المرتبط</dt>
                <dd>{selected.listing?.title ?? (selected.listingId ? `إعلان #${selected.listingId}` : "غير متوفر")}</dd>
              </div>
              <div>
                <dt>سعر الإعلان</dt>
                <dd>{formatCurrency(selected.listing?.price)}</dd>
              </div>
              <div>
                <dt>تاريخ تقديم البلاغ</dt>
                <dd>{formatReportDate(selected.createdAt)}</dd>
              </div>
              <div>
                <dt>تاريخ الإغلاق / التحديث</dt>
                <dd>{selected.status === "resolved" ? formatReportDate(selected.updatedAt) : "لم يُغلق بعد"}</dd>
              </div>
            </dl>

            {selected.status === "resolved" && (
              <div className="alert-box success">
                <CheckCircle2 aria-hidden="true" size={18} />
                <div>
                  <strong>تم إغلاق البلاغ مسبقاً</strong>
                  <p>
                    {selected.resolutionNotes
                      ? `ملاحظات القرار: ${selected.resolutionNotes}`
                      : "تمت معالجة البلاغ وتوثيق إغلاقه."}
                  </p>
                </div>
              </div>
            )}

            {Boolean(actionError) && (
              <div className="alert-box danger" role="alert">
                <Info aria-hidden="true" size={18} />
                <p>
                  <strong>تعذر حفظ القرار</strong>
                  {errorMessage(actionError)}
                </p>
              </div>
            )}

            {selected.status === "open" && (
              <div className="moderation-menu">
                <AuthorizedButton
                  resource="reports"
                  action="resolve"
                  type="button"
                  disabled={pending}
                  onClick={() => openResolutionDialog("dismiss")}
                >
                  <CheckCircle2 aria-hidden="true" size={18} />
                  <span>
                    <strong>إغلاق كبلاغ غير مثبت</strong>
                    <small>إغلاق وتوثيق في سجل التدقيق دون اتخاذ إجراء عقابي</small>
                  </span>
                </AuthorizedButton>

                <AuthorizedButton
                  resource="reports"
                  action="resolve"
                  additionallyRequires={[{ resource: "listings", action: "delete" }]}
                  type="button"
                  disabled={pending || (!selected.listingId && !selected.listing?.id)}
                  onClick={() => openResolutionDialog("delete_listing")}
                >
                  <Trash2 aria-hidden="true" size={18} />
                  <span>
                    <strong>حذف/إخفاء الإعلان المخالف</strong>
                    <small>إخفاء الإعلان فوراً من السوق وإغلاق البلاغ</small>
                  </span>
                </AuthorizedButton>

                <AuthorizedButton
                  resource="reports"
                  action="resolve"
                  additionallyRequires={[{ resource: "users", action: "ban" }]}
                  className="danger"
                  type="button"
                  disabled={pending || !accusedSeller || isAccusedSelf}
                  title={isAccusedSelf ? "لا يمكن للمشرف حظر حسابه الخاص" : undefined}
                  onClick={() => openResolutionDialog("ban_user")}
                >
                  <Ban aria-hidden="true" size={18} />
                  <span>
                    <strong>حظر المعلن المبلغ عنه</strong>
                    <small>
                      {isAccusedSelf
                        ? "حسابك الخاص (محمي من الحظر)"
                        : "إنهاء جلسات المعلن ومنعه من الدخول وإغلاق البلاغ"}
                    </small>
                  </span>
                </AuthorizedButton>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <FormDialog
        open={Boolean(activeAction)}
        title={activeAction ? REPORT_RESOLUTION_ACTION_LABELS[activeAction].title : ""}
        dirty={resolutionForm.formState.isDirty}
        submitting={pending}
        onClose={() => {
          setActiveAction(null);
          resolutionForm.reset();
        }}
      >
        {(requestClose) => (
          <ValidatedForm
            className="validated-form"
            onSubmit={resolutionForm.handleSubmit((values) => {
              void handleResolveSubmit(values);
            })}
          >
            {activeAction && (
              <div className="alert-box">
                <Info aria-hidden="true" size={18} />
                <p>
                  <strong>{REPORT_RESOLUTION_ACTION_LABELS[activeAction].title}:</strong>{" "}
                  {REPORT_RESOLUTION_ACTION_LABELS[activeAction].description}
                </p>
              </div>
            )}

            <TextareaField
              label="ملاحظات وتوثيق قرار الإجراء"
              rows={4}
              placeholder="دوّن سبب ومبررات القرار ليُحفظ رسمياً في سجل التدقيق الإداري"
              error={resolutionForm.formState.errors.notes?.message}
              {...resolutionForm.register("notes")}
            />

            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                disabled={pending}
                onClick={requestClose}
              >
                إلغاء
              </button>
              <SubmitButton
                className={`button ${activeAction === "ban_user" || activeAction === "delete_listing" ? "danger-button" : "primary"}`}
                pending={pending}
                pendingLabel="جارٍ تنفيذ القرار…"
              >
                تأكيد وتنفيذ القرار
              </SubmitButton>
            </div>
          </ValidatedForm>
        )}
      </FormDialog>
    </>
  );
}
