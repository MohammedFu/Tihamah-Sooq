import { zodResolver } from "@hookform/resolvers/zod";
import { useGetIdentity } from "@refinedev/core";
import { Ban, Eye, Info, Search, Unlock } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Drawer } from "../../../components/ui/Drawer";
import { FormDialog, SubmitButton, TextareaField, ValidatedForm } from "../../../components/ui/forms";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { MutationConflictAlert } from "../../../components/ui/MutationConflictAlert";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SensitiveValue } from "../../../components/ui/SensitiveValue";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAdminNotification } from "../../../providers/notificationStore";
import { ApiError, isMutationConflict } from "../../../services/http";
import type { AdminAccountIdentity, User } from "../../../types/domain";
import { ExportButton, type CsvColumn } from "../../../utils/exportUtils";
import { useUsers } from "../api/useUsers";
import { userBanSchema, type UserBanFormValues } from "../schemas/userBanSchema";

const userExportColumns: CsvColumn<User>[] = [
  { header: "رقم المستخدم", accessor: (u) => u.id },
  { header: "الاسم الكامل", accessor: (u) => u.fullName },
  { header: "رقم الجوال", accessor: (u) => u.phone },
  { header: "المنطقة", accessor: (u) => u.regionName ?? u.region?.name ?? "" },
  { header: "القرية", accessor: (u) => u.villageName ?? u.village?.name ?? "" },
  { header: "الحالة", accessor: (u) => (u.isBanned ? "محظور" : "نشط") },
  { header: "تاريخ التسجيل", accessor: (u) => u.createdAt },
];

const statusFilters = [
  { value: "all", label: "كل الحسابات" },
  { value: "active", label: "الحسابات النشطة" },
  { value: "banned", label: "الحسابات المحظورة" },
] as const;

const dateFormatter = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" });
function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : dateFormatter.format(parsed);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.userMessage;
  if (error instanceof Error) return error.message;
  return "تعذر إكمال العملية، يرجى المحاولة مرة أخرى.";
}

function userColumns(
  onSelect: (user: User) => void,
  onBan: (user: User) => void,
  onUnban: (user: User) => void,
  isSelfAdmin: (user: User) => boolean,
  pending: boolean,
): DataTableColumn<User>[] {
  return [
    {
      id: "user",
      header: "المستخدم",
      cell: (user) => (
        <div className="user-cell">
          <span>{user.fullName.slice(0, 1)}</span>
          <div>
            <strong>{user.fullName}</strong>
            <small className="block-copy">
              <SensitiveValue value={user.phone} type="phone" resource="users" action="show" label="رقم الجوال" />
            </small>
          </div>
        </div>
      ),
    },
    {
      id: "location",
      header: "الموقع",
      cell: (user) => (
        <>
          {user.villageName ?? user.village?.name ?? "—"}
          <small className="block-copy">{user.regionName ?? user.region?.name ?? ""}</small>
        </>
      ),
    },
    {
      id: "joinedAt",
      header: "تاريخ التسجيل",
      cell: (user) => formatDate(user.createdAt),
    },
    {
      id: "status",
      header: "حالة الحساب",
      cell: (user) => <StatusBadge value={user.isBanned ? "banned" : "active"} />,
    },
    {
      id: "action",
      header: "الإجراء",
      cell: (user) => {
        const isSelf = isSelfAdmin(user);
        return (
          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
            <AuthorizedButton
              resource="users"
              action="show"
              className="icon-button table-action"
              type="button"
              onClick={() => onSelect(user)}
              aria-label={`عرض بيانات ${user.fullName}`}
              title="عرض المستخدم"
            >
              <Eye size={17} />
            </AuthorizedButton>
            {user.isBanned ? (
              <AuthorizedButton
                resource="users"
                action="ban"
                className="icon-button table-action success"
                type="button"
                disabled={pending}
                onClick={() => onUnban(user)}
                aria-label={`إلغاء حظر ${user.fullName}`}
                title="إلغاء الحظر"
              >
                <Unlock size={17} />
              </AuthorizedButton>
            ) : (
              <AuthorizedButton
                resource="users"
                action="ban"
                className="icon-button table-action danger"
                type="button"
                disabled={pending || isSelf}
                onClick={() => onBan(user)}
                aria-label={isSelf ? "لا يمكن للمشرف حظر حسابه الخاص" : `حظر ${user.fullName}`}
                title={isSelf ? "لا يمكن للمشرف حظر حسابه الخاص" : "حظر المستخدم"}
              >
                <Ban size={17} />
              </AuthorizedButton>
            )}
          </div>
        );
      },
    },
  ];
}

export function UsersPage() {
  const table = useDataTableUrlState<"status">({
    filters: [{ name: "status", defaultValue: "all", values: statusFilters.map((f) => f.value) }],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  });
  const status = (table.filters.status as "all" | "active" | "banned") || "all";
  const deferredSearch = useDeferredValue(table.search);

  const api = useUsers({
    page: table.page,
    pageSize: table.pageSize,
    status,
    search: deferredSearch,
  });

  const identity = useGetIdentity<AdminAccountIdentity | null>();
  const currentAdmin = identity.data;

  function isSelfAdmin(user: User | null | undefined): boolean {
    if (!user || !currentAdmin) return false;
    const adminPhone = currentAdmin.phone?.trim();
    const userPhone = user.phone?.trim();
    if (adminPhone && userPhone && adminPhone === userPhone) return true;
    if (currentAdmin.id === user.id) return true;
    return false;
  }

  const [selected, setSelected] = useState<User | null>(null);
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<User | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const notification = useAdminNotification();
  const banForm = useForm<UserBanFormValues>({
    resolver: zodResolver(userBanSchema),
    defaultValues: { reason: "" },
  });

  const rows = api.list.result.data ?? [];
  const total = api.list.result.total ?? 0;
  const pending = api.update.mutation.isPending;

  function openBan(user: User) {
    if (isSelfAdmin(user)) return;
    setActionError(null);
    banForm.reset({ reason: "" });
    setBanTarget(user);
  }

  function openUnban(user: User) {
    setActionError(null);
    setUnbanTarget(user);
  }

  async function handleBan(values: UserBanFormValues) {
    if (!banTarget || isSelfAdmin(banTarget)) return;
    const target = banTarget;
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.ban(target.id, { isBanned: true, reason: values.reason }),
        {
          key: `user-${target.id}-ban`,
          progress: "جارٍ حظر الحساب وإنهاء الجلسات النشطة…",
          success: "تم حظر الحساب وإنهاء جميع الجلسات النشطة للمستخدم فورياً.",
          error: (err) => errorMessage(err),
        },
      );
      setSelected((current) => (current?.id === target.id ? { ...current, isBanned: true, banReason: values.reason } : current));
      setBanTarget(null);
      banForm.reset();
    } catch (err) {
      setActionError(err);
      if (isMutationConflict(err)) setBanTarget(null);
    }
  }

  async function handleUnban() {
    if (!unbanTarget) return;
    const target = unbanTarget;
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.ban(target.id, { isBanned: false }),
        {
          key: `user-${target.id}-unban`,
          progress: "جارٍ إلغاء حظر الحساب…",
          success: "تم إلغاء حظر الحساب بنجاح.",
          error: (err) => errorMessage(err),
        },
      );
      setSelected((current) => (current?.id === target.id ? { ...current, isBanned: false, banReason: null } : current));
      setUnbanTarget(null);
    } catch (err) {
      setActionError(err);
      if (isMutationConflict(err)) setUnbanTarget(null);
    }
  }

  async function refreshAfterConflict() {
    try {
      await api.list.query.refetch({ throwOnError: true });
      setActionError(null);
      setSelected(null);
      setBanTarget(null);
      setUnbanTarget(null);
      banForm.reset();
    } catch {
      // Keep the original conflict visible until a fresh list is available.
    }
  }

  const columns = useMemo(
    () => userColumns((user) => setSelected(user), openBan, openUnban, isSelfAdmin, pending),
    [currentAdmin, pending],
  );

  return (
    <>
      <PageHeader
        title="إدارة المستخدمين"
        description="البحث في حسابات العملاء، مراجعة نشاطهم، وإدارة الحظر وإبطال الجلسات."
      />

      <section className="card data-surface">
        <div className="tabs-row" role="group" aria-label="تصفية المستخدمين حسب الحالة">
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
          caption="قائمة حسابات المستخدمين"
          columns={columns}
          rows={rows}
          rowKey={(user) => user.id}
          loading={api.list.query.isPending}
          error={api.list.query.isError ? api.list.query.error : undefined}
          onRetry={() => { void api.list.query.refetch(); }}
          retrying={api.list.query.isFetching}
          emptyMessage="لا توجد حسابات مطابقة للفلاتر الحالية."
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
                  placeholder="بحث بالاسم أو رقم الجوال"
                  aria-label="البحث في المستخدمين"
                />
              </label>
              <div className="table-actions-group">
                <span className="record-count">{total.toLocaleString("ar-SA")} مستخدم</span>
                <ExportButton
                  filename={`tihamah-users-${status}`}
                  data={rows}
                  columns={userExportColumns}
                />
              </div>
            </div>
          }
        />
      </section>

      <Drawer
        open={Boolean(selected)}
        title={selected ? selected.fullName : ""}
        onClose={() => { if (!pending) setSelected(null); }}
      >
        {selected && (
          <div className="detail-stack">
            <div className="profile-hero">
              <span>{selected.fullName.slice(0, 1)}</span>
              <div>
                <h3>{selected.fullName}</h3>
                <p>
                  <SensitiveValue value={selected.phone} type="phone" resource="users" action="show" label="رقم الجوال" />
                </p>
              </div>
              <StatusBadge value={selected.isBanned ? "banned" : "active"} />
            </div>

            {selected.isBanned && selected.banReason && (
              <div className="alert-box danger">
                <Ban size={18} />
                <div>
                  <strong>سبب الحظر</strong>
                  <p>{selected.banReason}</p>
                </div>
              </div>
            )}

            <dl className="detail-grid">
              <div>
                <dt>المنطقة</dt>
                <dd>{selected.regionName ?? selected.region?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>القرية</dt>
                <dd>{selected.villageName ?? selected.village?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>تاريخ التسجيل</dt>
                <dd>{formatDate(selected.createdAt)}</dd>
              </div>
              {selected.stats && (
                <>
                  <div>
                    <dt>إجمالي الإعلانات</dt>
                    <dd className="numeric">{selected.stats.totalListings.toLocaleString("ar-SA")}</dd>
                  </div>
                  <div>
                    <dt>الإعلانات النشطة</dt>
                    <dd className="numeric">{selected.stats.activeListings.toLocaleString("ar-SA")}</dd>
                  </div>
                  <div>
                    <dt>الإعلانات المباعة</dt>
                    <dd className="numeric">{selected.stats.soldListings.toLocaleString("ar-SA")}</dd>
                  </div>
                  <div>
                    <dt>العمولات</dt>
                    <dd className="numeric">{selected.stats.totalCommissions.toLocaleString("ar-SA")} ر.س</dd>
                  </div>
                  <div>
                    <dt>البلاغات</dt>
                    <dd className="numeric">{selected.stats.totalReports.toLocaleString("ar-SA")}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>الأجهزة النشطة</dt>
                <dd className="numeric">{selected.devices?.length ?? 0}</dd>
              </div>
            </dl>

            {Boolean(actionError) && (isMutationConflict(actionError) ? (
              <MutationConflictAlert error={actionError} refreshing={api.list.query.isFetching} onRefresh={refreshAfterConflict} />
            ) : (
              <div className="alert-box danger" role="alert">
                <Info aria-hidden="true" size={18} />
                <div>
                  <strong>تعذر إكمال العملية</strong>
                  <p>{errorMessage(actionError)}</p>
                </div>
              </div>
            ))}

            <div className="decision-actions">
              {selected.isBanned ? (
                <AuthorizedButton
                  resource="users"
                  action="ban"
                  className="button success-button"
                  type="button"
                  disabled={pending}
                  onClick={() => openUnban(selected)}
                >
                  <Unlock size={17} />
                  إلغاء الحظر
                </AuthorizedButton>
              ) : (
                <AuthorizedButton
                  resource="users"
                  action="ban"
                  className="button danger-button"
                  type="button"
                  disabled={pending || isSelfAdmin(selected)}
                  onClick={() => openBan(selected)}
                  title={isSelfAdmin(selected) ? "لا يمكن للمشرف حظر حسابه الخاص" : undefined}
                  aria-label={isSelfAdmin(selected) ? "لا يمكن للمشرف حظر حسابه الخاص" : "حظر المستخدم"}
                >
                  <Ban size={17} />
                  حظر المستخدم
                </AuthorizedButton>
              )}
            </div>
            {isSelfAdmin(selected) && (
              <p className="block-copy text-muted" style={{ textAlign: "center", margin: 0 }}>
                حساب المشرف الحالي (محمي من الحظر الذاتي)
              </p>
            )}
          </div>
        )}
      </Drawer>

      <FormDialog
        open={Boolean(banTarget)}
        title={`حظر حساب المستخدم: ${banTarget?.fullName ?? ""}`}
        dirty={banForm.formState.isDirty}
        submitting={pending}
        onClose={() => {
          setBanTarget(null);
          banForm.reset();
        }}
      >
        {(requestClose) => (
          <ValidatedForm
            className="validated-form"
            onSubmit={banForm.handleSubmit((values) => {
              void handleBan(values);
            })}
          >
            <div className="alert-box danger">
              <Ban size={18} />
              <p>سيتم إنهاء جميع جلسات المستخدم وإبطال رموز الدخول والوصول فورياً من الخادم.</p>
            </div>
            <TextareaField
              label="سبب الحظر"
              rows={4}
              placeholder="اكتب سبباً واضحاً ومفصلاً للحظر ليُحفظ في سجل التدقيق (3 أحرف على الأقل)"
              error={banForm.formState.errors.reason?.message}
              {...banForm.register("reason")}
            />
            <div className="modal-actions">
              <button className="button secondary" type="button" disabled={pending} onClick={requestClose}>
                إلغاء
              </button>
              <SubmitButton className="button danger-button" pending={pending} pendingLabel="جارٍ حظر الحساب…">
                تأكيد الحظر
              </SubmitButton>
            </div>
          </ValidatedForm>
        )}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(unbanTarget)}
        title="إلغاء حظر المستخدم"
        intent="success"
        icon={<Unlock aria-hidden="true" size={22} />}
        description={
          unbanTarget ? (
            <p>
              هل أنت متأكد من رغبتك في إلغاء حظر حساب «<strong>{unbanTarget.fullName}</strong>»؟
            </p>
          ) : undefined
        }
        consequence="سيتمكن المستخدم من تسجيل الدخول واستئناف استخدام المنصة فوراً."
        confirmLabel="تأكيد إلغاء الحظر"
        pendingLabel="جارٍ إلغاء الحظر…"
        submitting={pending}
        resource="users"
        action="ban"
        onConfirm={() => {
          void handleUnban();
        }}
        onClose={() => {
          if (!pending) setUnbanTarget(null);
        }}
      />
    </>
  );
}
