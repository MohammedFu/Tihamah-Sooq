import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Eye,
  FileCheck2,
  Info,
  Maximize2,
  Search,
  X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Drawer } from "../../../components/ui/Drawer";
import { FormDialog, SelectField, SubmitButton, TextareaField, ValidatedForm } from "../../../components/ui/forms";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SensitiveValue } from "../../../components/ui/SensitiveValue";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAdminNotification } from "../../../providers/notificationStore";
import { isApiError } from "../../../services/http";
import type { Commission, CommissionStatus } from "../../../types/domain";
import { useDashboardMetrics } from "../../dashboard/api/useDashboardMetrics";
import { useCommissions } from "../api/useCommissions";
import {
  COMMISSION_REJECTION_REASONS,
  commissionRejectionSchema,
  type CommissionRejectionValues,
} from "../schemas/commissionSchema";
import {
  calculateExpectedCommission,
  formatCurrency,
  isCommissionMismatch,
} from "../utils/commissionCalculations";

const statusFilters: Array<{ label: string; value: "all" | CommissionStatus }> = [
  { label: "كل الحالات", value: "all" },
  { label: "بانتظار التدقيق", value: "paid" },
  { label: "غير مسدد", value: "unpaid" },
  { label: "مسدد ومعتمد", value: "verified" },
  { label: "مرفوض", value: "rejected" },
];

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "غير متاح" : dateFormatter.format(date);
}

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.userMessage : "تعذر حفظ القرار، يرجى المحاولة لاحقاً.";
}

function commissionColumns(onSelect: (record: Commission) => void): DataTableColumn<Commission>[] {
  return [
    {
      id: "id",
      header: "رقم الفاتورة",
      cell: (item) => <bdi dir="ltr">#{item.id}</bdi>,
    },
    {
      id: "seller",
      header: "البائع",
      cell: (item) => (
        <>
          <strong>{item.seller?.fullName ?? "بائع غير متاح"}</strong>
          <small className="block-copy">
            <SensitiveValue value={item.seller?.phone} type="phone" resource="commissions" action="show" label="رقم جوال البائع" />
          </small>
        </>
      ),
    },
    {
      id: "listing",
      header: "الإعلان المباع",
      cell: (item) => (
        <>
          {item.listing?.title ?? `إعلان #${item.listingId}`}
          <small className="block-copy">
            إعلان <bdi dir="ltr">#{item.listingId}</bdi>
          </small>
        </>
      ),
    },
    {
      id: "soldPrice",
      header: "قيمة البيع",
      className: "numeric",
      cell: (item) => formatCurrency(item.soldPrice ?? item.listing?.price),
    },
    {
      id: "amount",
      header: "العمولة 1%",
      className: "numeric emphasis",
      cell: (item) => {
        const soldPrice = item.soldPrice ?? item.listing?.price;
        const mismatch = isCommissionMismatch(item.amount, soldPrice);
        return (
          <span>
            <span>{formatCurrency(item.amount)}</span>
            {mismatch && (
              <span className="badge warning" style={{ marginRight: 6 }} title="يوجد فارق عن نسبة 1% المحسوبة">
                فارق 1%
              </span>
            )}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "الحالة",
      cell: (item) => <StatusBadge value={item.status} />,
    },
    {
      id: "action",
      header: "التدقيق",
      cell: (item) => (
        <AuthorizedButton
          resource="commissions"
          action="show"
          className="icon-button table-action"
          type="button"
          onClick={() => onSelect(item)}
          aria-label={`تدقيق عمولة الفاتورة ${item.id}`}
          title="تدقيق العمولة"
        >
          <Eye aria-hidden="true" size={17} />
        </AuthorizedButton>
      ),
    },
  ];
}

export function CommissionsPage() {
  const table = useDataTableUrlState<"status">({
    filters: [
      {
        name: "status",
        defaultValue: "all",
        values: statusFilters.map((filter) => filter.value),
      },
    ],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  });
  const status = table.filters.status as "all" | CommissionStatus;
  const deferredSearch = useDeferredValue(table.search);

  const api = useCommissions({
    page: table.page,
    pageSize: table.pageSize,
    status,
  });

  const { query: dashboardQuery } = useDashboardMetrics();
  const metrics = dashboardQuery.data?.data;

  const [selected, setSelected] = useState<Commission | null>(null);
  const [approving, setApproving] = useState<Commission | null>(null);
  const [rejecting, setRejecting] = useState<Commission | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const notification = useAdminNotification();

  const rejectionForm = useForm<CommissionRejectionValues>({
    resolver: zodResolver(commissionRejectionSchema),
    defaultValues: { reason: "", notes: "" },
  });

  const rows = useMemo(() => api.list.result.data ?? [], [api.list.result.data]);
  const total = api.list.result.total ?? 0;
  const pending = api.update.mutation.isPending;

  const visibleRows = useMemo(() => {
    if (!deferredSearch.trim()) return rows;
    const query = deferredSearch.trim().toLowerCase();
    return rows.filter((item) => {
      const seller = item.seller?.fullName?.toLowerCase() ?? "";
      const phone = item.seller?.phone?.toLowerCase() ?? "";
      const listingTitle = item.listing?.title?.toLowerCase() ?? "";
      const idStr = String(item.id);
      const listingIdStr = String(item.listingId);
      return (
        seller.includes(query) ||
        phone.includes(query) ||
        listingTitle.includes(query) ||
        idStr.includes(query) ||
        listingIdStr.includes(query)
      );
    });
  }, [rows, deferredSearch]);

  const columns = useMemo(
    () =>
      commissionColumns((record) => {
        setSelected(record);
        setActionError(null);
      }),
    [],
  );

  async function handleVerify(commission: Commission) {
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.verify(commission.id, { status: "verified" }),
        {
          key: `commission-${commission.id}-verify`,
          progress: "جارٍ اعتماد السداد وتحديث ذمة البائع…",
          success: "تم اعتماد السداد وتحديث ذمة البائع بنجاح بعد تأكيد الخادم.",
          error: errorMessage,
        },
      );
      setSelected((current) => (current?.id === commission.id ? { ...current, status: "verified" } : current));
      setApproving(null);
    } catch (error) {
      setActionError(error);
    }
  }

  function openRejection(commission: Commission) {
    rejectionForm.reset({ reason: "", notes: "" });
    setRejecting(commission);
    setActionError(null);
  }

  async function handleReject(values: CommissionRejectionValues) {
    if (!rejecting) return;
    setActionError(null);
    const fullNotes = values.notes ? `${values.reason}: ${values.notes}` : values.reason;
    try {
      await notification.trackPromise(
        () => api.verify(rejecting.id, { status: "rejected", notes: fullNotes }),
        {
          key: `commission-${rejecting.id}-reject`,
          progress: "جارٍ حفظ قرار رفض الإشعار…",
          success: "تم تسجيل قرار رفض الإشعار بنجاح.",
          error: errorMessage,
        },
      );
      setSelected((current) => (current?.id === rejecting.id ? { ...current, status: "rejected" } : current));
      setRejecting(null);
      rejectionForm.reset();
    } catch (error) {
      setActionError(error);
    }
  }

  return (
    <>
      <PageHeader
        title="تدقيق العمولات المالية"
        description="مطابقة إشعارات التحويل البنكي واعتماد عمولة المنصة البالغة 1% استناداً إلى بيانات الخادم الرسمية."
      />

      <div className="financial-summary">
        <article className="card">
          <small>بانتظار التدقيق</small>
          <strong>{formatCurrency(metrics?.paidCommissions ?? 0)}</strong>
          <span>إيصالات مدفوعة بانتظار الاعتماد</span>
        </article>
        <article className="card">
          <small>عمولات مستحقة غير مسددة</small>
          <strong>{formatCurrency(metrics?.pendingCommissions ?? 0)}</strong>
          <span>مبيعات مكتملة لم يُسدد إشعارها</span>
        </article>
        <article className="card">
          <small>إجمالي العمولات المسجلة</small>
          <strong>{formatCurrency(metrics?.totalCommissions ?? 0)}</strong>
          <span>عمولات المنصة الإجمالية</span>
        </article>
      </div>

      <section className="card data-surface">
        <div className="tabs-row" role="group" aria-label="تصفية العمولات حسب الحالة">
          {statusFilters.map((filter) => (
            <button
              className={`tab-button ${status === filter.value ? "active" : ""}`}
              type="button"
              key={filter.value}
              aria-pressed={status === filter.value}
              onClick={() => table.setFilter("status", filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <DataTable
          caption="قائمة سجلات العمولات المالية"
          columns={columns}
          rows={visibleRows}
          rowKey={(item) => item.id}
          loading={api.list.query.isPending}
          error={api.list.query.isError ? api.list.query.error : undefined}
          onRetry={() => {
            void api.list.query.refetch();
          }}
          retrying={api.list.query.isFetching}
          emptyMessage="لا توجد عمولات مطابقة للفلاتر الحالية."
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
                  placeholder="بحث باسم البائع، الجوال، الإعلان، أو رقم الفاتورة"
                  aria-label="البحث في العمولات"
                />
              </label>
              <span className="record-count">{total.toLocaleString("ar-SA")} سجل عمولة</span>
            </div>
          }
        />
      </section>

      <Drawer
        open={Boolean(selected)}
        title={selected ? `تدقيق الفاتورة #${selected.id}` : ""}
        onClose={() => {
          if (!pending) setSelected(null);
        }}
      >
        {selected && (
          <div className="detail-stack">
            <div className="commission-amount">
              <FileCheck2 size={22} />
              <span>
                <small>العمولة المطلوب مطابقتها (المسجلة بالخادم)</small>
                <strong>{formatCurrency(selected.amount)}</strong>
              </span>
              <StatusBadge value={selected.status} />
            </div>

            {(() => {
              const soldPrice = selected.soldPrice ?? selected.listing?.price;
              const expected = calculateExpectedCommission(soldPrice);
              const mismatch = isCommissionMismatch(selected.amount, soldPrice);

              if (mismatch) {
                return (
                  <div className="alert-box warning" role="alert">
                    <AlertTriangle aria-hidden="true" size={18} />
                    <div>
                      <strong>تنبيه: عدم تطابق في حساب العمولة 1%</strong>
                      <p>
                        المبلغ المحسوب (1% من قيمة البيع {formatCurrency(soldPrice)}) هو{" "}
                        <strong>{formatCurrency(expected)}</strong> بينما المبلغ المسجل في الخادم هو{" "}
                        <strong>{formatCurrency(selected.amount)}</strong>.
                        المبلغ المسجل في الخادم يظل هو المعتمد رسمياً ما لم يتم رفض الإشعار من قِبل المشرف.
                      </p>
                    </div>
                  </div>
                );
              }

              if (expected !== null) {
                return (
                  <div className="alert-box success" role="status">
                    <Check aria-hidden="true" size={18} />
                    <div>
                      <strong>مطابقة تامة للنسبة النظامية</strong>
                      <p>
                        مبلغ العمولة ({formatCurrency(selected.amount)}) يطابق تماماً نسبة 1% من قيمة البيع (
                        {formatCurrency(soldPrice)}).
                      </p>
                    </div>
                  </div>
                );
              }

              return null;
            })()}

            <dl className="detail-grid">
              <div>
                <dt>البائع</dt>
                <dd>{selected.seller?.fullName ?? "غير متاح"}</dd>
              </div>
              <div>
                <dt>رقم الجوال</dt>
                <dd>
                  <SensitiveValue value={selected.seller?.phone} type="phone" resource="commissions" action="show" label="رقم جوال البائع" />
                </dd>
              </div>
              <div>
                <dt>الإعلان المباع</dt>
                <dd>{selected.listing?.title ?? `إعلان #${selected.listingId}`}</dd>
              </div>
              <div>
                <dt>قيمة البيع المعلنة</dt>
                <dd>{formatCurrency(selected.soldPrice ?? selected.listing?.price)}</dd>
              </div>
              <div>
                <dt>تاريخ العملية</dt>
                <dd>{formatDate(selected.createdAt)}</dd>
              </div>
              <div>
                <dt>المشرف المعتمد</dt>
                <dd>
                  {selected.verifiedBy?.name ??
                    (selected.verifiedById ? `مشرف #${selected.verifiedById}` : "لم يعتمد بعد")}
                </dd>
              </div>
            </dl>

            {selected.transferReceiptUrl ? (
              <figure className="receipt-preview">
                <figcaption>صورة إشعار التحويل البنكي</figcaption>
                <div className="media-preview">
                  <img src={selected.transferReceiptUrl} alt="إشعار التحويل البنكي" />
                  <button
                    type="button"
                    onClick={() => setViewingReceipt(selected.transferReceiptUrl)}
                    aria-label="تكبير إشعار التحويل"
                  >
                    <Maximize2 aria-hidden="true" size={14} />
                    <span>تكبير الإشعار</span>
                  </button>
                </div>
              </figure>
            ) : (
              <div className="empty-state-small">لم يرفع البائع إشعار التحويل البنكي بعد.</div>
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

            <div className="decision-actions">
              {selected.status === "paid" && (
                <>
                  <AuthorizedButton
                    resource="commissions"
                    action="verify"
                    className="button success-button"
                    type="button"
                    disabled={pending}
                    aria-busy={pending}
                    onClick={() => setApproving(selected)}
                  >
                    <Check aria-hidden="true" size={17} />
                    اعتماد السداد
                  </AuthorizedButton>
                  <AuthorizedButton
                    resource="commissions"
                    action="reject"
                    className="button danger-outline"
                    type="button"
                    disabled={pending}
                    onClick={() => openRejection(selected)}
                  >
                    <X aria-hidden="true" size={17} />
                    رفض الإشعار
                  </AuthorizedButton>
                </>
              )}
              {selected.status === "verified" && (
                <div className="alert-box success" style={{ width: "100%" }}>
                  <Check aria-hidden="true" size={16} />
                  <span>تم اعتماد هذا السداد رسمياً وتحديث ذمة البائع في النظام.</span>
                </div>
              )}
              {selected.status === "rejected" && (
                <div className="alert-box danger" style={{ width: "100%" }}>
                  <X aria-hidden="true" size={16} />
                  <span>تم رفض إشعار التحويل هذا سابقاً.</span>
                </div>
              )}
              {selected.status === "unpaid" && (
                <div className="alert-box" style={{ width: "100%" }}>
                  <Info aria-hidden="true" size={16} />
                  <span>بانتظار قيام البائع بتحويل العمولة ورفع الإشعار البنكي.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(approving)}
        title="تأكيد اعتماد سداد العمولة"
        intent="success"
        icon={<Check aria-hidden="true" size={22} />}
        description={
          approving ? (
            <p>
              هل أنت متأكد من اعتماد سداد الفاتورة <strong>#{approving.id}</strong> بمبلغ{" "}
              <strong>{formatCurrency(approving.amount)}</strong>؟
            </p>
          ) : undefined
        }
        consequence="سيتم تحديث حالة العمولة إلى معتمدة رسمياً وإشعار البائع عبر النظام."
        confirmLabel="تأكيد الاعتماد"
        pendingLabel="جارٍ الاعتماد…"
        submitting={pending}
        resource="commissions"
        action="verify"
        onConfirm={() => {
          if (approving) void handleVerify(approving);
        }}
        onClose={() => setApproving(null)}
      />

      <FormDialog
        open={Boolean(rejecting)}
        title="رفض إشعار التحويل البنكي"
        dirty={rejectionForm.formState.isDirty}
        submitting={pending}
        onClose={() => {
          setRejecting(null);
          rejectionForm.reset();
        }}
      >
        {(requestClose) => (
          <ValidatedForm
            className="validated-form"
            onSubmit={rejectionForm.handleSubmit((values) => {
              void handleReject(values);
            })}
          >
            <SelectField
              label="سبب الرفض"
              error={rejectionForm.formState.errors.reason?.message}
              {...rejectionForm.register("reason")}
            >
              <option value="">اختر سبباً للرفض</option>
              {COMMISSION_REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectField>

            <TextareaField
              label="ملاحظات توضيحية إضافية"
              rows={4}
              placeholder="مثال: يرجى رفع إيصال واضح يظهر به رقم العملية واسم المحول"
              error={rejectionForm.formState.errors.notes?.message}
              {...rejectionForm.register("notes")}
            />

            <div className="alert-box">
              <Info aria-hidden="true" size={18} />
              <p>
                <strong>فجوة في عقد الخادم:</strong> واجهة الخادم الحالية تقبل الحالة فقط ولا تخزن سبب الرفض في قاعدة البيانات. سبب الرفض مسجل للتوثيق والتدقيق المحلي فقط.
              </p>
            </div>

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
                className="button danger-button"
                pending={pending}
                pendingLabel="جارٍ حفظ القرار…"
              >
                تأكيد الرفض
              </SubmitButton>
            </div>
          </ValidatedForm>
        )}
      </FormDialog>

      <Modal
        open={Boolean(viewingReceipt)}
        title="معاينة إشعار التحويل البنكي"
        onClose={() => setViewingReceipt(null)}
      >
        {viewingReceipt && (
          <div className="receipt-zoom-container">
            <img src={viewingReceipt} alt="صورة مكبرة لإشعار التحويل البنكي" />
            <div className="modal-actions" style={{ justifyContent: "space-between", width: "100%" }}>
              <a
                href={viewingReceipt}
                target="_blank"
                rel="noreferrer noopener"
                className="button secondary"
              >
                <ExternalLink aria-hidden="true" size={15} />
                <span>فتح في نافذة جديدة</span>
              </a>
              <button
                className="button"
                type="button"
                onClick={() => setViewingReceipt(null)}
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
