import { zodResolver } from "@hookform/resolvers/zod";
import { usePermissions } from "@refinedev/core";
import { BellRing, History, Info, LockKeyhole, MessageSquareText, Pencil, Send, Settings, ShieldCheck } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { FormDialog, SubmitButton, TextareaField, TextField, ValidatedForm } from "../../../components/ui/forms";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { canAccessWithPermissions } from "../../../providers/accessControlProvider";
import { useAdminNotification } from "../../../providers/notificationStore";
import { ApiError } from "../../../services/http";
import type { AdminAuditRecord, Permission } from "../../../types/domain";
import { ExportButton, type CsvColumn } from "../../../utils/exportUtils";
import { useSystemOperations, type SettingRecord } from "../api/useSystemOperations";
import {
  broadcastSchema,
  settingSchema,
  smsConfigurationSchema,
  type BroadcastFormValues,
  type SettingFormValues,
  type SmsConfigurationFormValues,
} from "../schemas/systemSchemas";

type SystemTab = "broadcast" | "settings" | "audit";

const dateFormatter = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" });

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : dateFormatter.format(parsed);
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.requestId ? `${error.userMessage} (معرّف الطلب: ${error.requestId})` : error.userMessage;
  if (error instanceof Error) return error.message;
  return "تعذر إكمال العملية. يرجى المحاولة مرة أخرى.";
}

function parseBooleanSetting(value: string | undefined): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function formatMetadata(metadata: Readonly<Record<string, unknown>> | null | undefined): string | null {
  if (!metadata) return null;
  const parts: string[] = [];
  if (typeof metadata.reason === "string" && metadata.reason) parts.push(`السبب: ${metadata.reason}`);
  if (typeof metadata.notes === "string" && metadata.notes) parts.push(`الملاحظات: ${metadata.notes}`);
  if (typeof metadata.title === "string" && metadata.title) parts.push(`العنوان: ${metadata.title}`);
  if (typeof metadata.key === "string" && metadata.key) parts.push(`المفتاح: ${metadata.key}`);
  if (typeof metadata.provider === "string" && metadata.provider) parts.push(`المزود: ${metadata.provider}`);
  if (Array.isArray(metadata.keys) && metadata.keys.length > 0) parts.push(`المفاتيح: ${metadata.keys.join(", ")}`);
  if (typeof metadata.soft_delete === "boolean" && metadata.soft_delete) parts.push("حذف ناعم");
  if (typeof metadata.is_otp_enabled === "boolean") parts.push(`OTP: ${metadata.is_otp_enabled ? "مفعّل" : "معطّل"}`);
  if (parts.length > 0) return parts.join(" | ");
  return null;
}

const auditColumns: DataTableColumn<AdminAuditRecord>[] = [
  { id: "id", header: "الرقم", className: "numeric", cell: (log) => <bdi dir="ltr">#{log.id}</bdi> },
  { id: "admin", header: "المشرف", cell: (log) => log.admin?.name || <bdi dir="ltr">#{log.adminId}</bdi> },
  { id: "action", header: "الإجراء", cell: (log) => <code className="action-code" dir="ltr">{log.action}</code> },
  { id: "entity", header: "الكيان", cell: (log) => <code dir="ltr">{log.entityType}{log.entityId === null ? "" : ` #${log.entityId}`}</code> },
  {
    id: "details",
    header: "التفاصيل والملاحظات",
    cell: (log) => {
      const formatted = formatMetadata(log.metadata);
      return formatted ? <span className="audit-details-text">{formatted}</span> : <span className="text-muted">—</span>;
    },
  },
  { id: "ip", header: "عنوان IP", cell: (log) => <bdi dir="ltr">{log.ipAddress}</bdi> },
  { id: "at", header: "الوقت", cell: (log) => formatDate(log.createdAt) },
];

const auditExportColumns: CsvColumn<AdminAuditRecord>[] = [
  { header: "الرقم", accessor: (log) => log.id },
  { header: "المشرف", accessor: (log) => log.admin?.name || log.adminId },
  { header: "الإجراء", accessor: (log) => log.action },
  { header: "نوع الكيان", accessor: (log) => `${log.entityType}${log.entityId === null ? "" : ` #${log.entityId}`}` },
  { header: "عنوان IP", accessor: (log) => log.ipAddress },
  { header: "التفاصيل", accessor: (log) => formatMetadata(log.metadata) ?? "" },
  { header: "الوقت", accessor: (log) => log.createdAt },
];

export function SystemPage() {
  const permissions = usePermissions<readonly Permission[]>({});
  const canBroadcast = permissions.isSuccess && canAccessWithPermissions(permissions.data, "notifications", "broadcast");
  const canSettings = permissions.isSuccess && canAccessWithPermissions(permissions.data, "settings", "manage_settings");
  const canAudit = permissions.isSuccess && canAccessWithPermissions(permissions.data, "audit", "list");
  const availableTabs = useMemo(() => ([
    canBroadcast && "broadcast",
    canSettings && "settings",
    canAudit && "audit",
  ] as const).filter((item): item is SystemTab => Boolean(item)), [canAudit, canBroadcast, canSettings]);

  const [tab, setTab] = useState<SystemTab>("broadcast");
  const table = useDataTableUrlState({ defaultPageSize: 10, pageSizeOptions: [10, 20, 50] });
  const deferredAuditSearch = useDeferredValue(table.search);
  const api = useSystemOperations({
    canBroadcast,
    canSettings,
    canAudit,
    auditPage: table.page,
    auditPageSize: table.pageSize,
    auditSearch: deferredAuditSearch,
  });
  const notification = useAdminNotification();

  const broadcastForm = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { title: "", body: "" },
  });
  const settingForm = useForm<SettingFormValues>({
    resolver: zodResolver(settingSchema),
    defaultValues: { value: "", description: "" },
  });
  const smsForm = useForm<SmsConfigurationFormValues>({
    resolver: zodResolver(smsConfigurationSchema),
    defaultValues: { provider: "", apiKey: "", senderName: "", username: "", userSender: "" },
  });

  const [broadcastReview, setBroadcastReview] = useState<BroadcastFormValues | null>(null);
  const [editingSetting, setEditingSetting] = useState<SettingRecord | null>(null);
  const [editingSms, setEditingSms] = useState(false);
  const [otpTarget, setOtpTarget] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  useEffect(() => {
    if (permissions.isSuccess && !availableTabs.includes(tab) && availableTabs[0]) setTab(availableTabs[0]);
  }, [availableTabs, permissions.isSuccess, tab]);

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || availableTabs.length < 2) return;
    event.preventDefault();
    const currentIndex = availableTabs.indexOf(tab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? availableTabs.length - 1
        : event.key === "ArrowLeft"
          ? (currentIndex + 1) % availableTabs.length
          : (currentIndex - 1 + availableTabs.length) % availableTabs.length;
    const next = availableTabs[nextIndex];
    setTab(next);
    window.requestAnimationFrame(() => document.getElementById(`system-${next}-tab`)?.focus());
  }

  async function confirmBroadcast() {
    if (!broadcastReview || api.isPending) return;
    const values = broadcastReview;
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.broadcast({ ...values, audience: "all" }),
        {
          key: "system-broadcast",
          progress: "جارٍ إرسال الإشعار العام…",
          success: "أكد الخادم قبول الإشعار العام للإرسال.",
          error: errorMessage,
        },
      );
      setBroadcastReview(null);
      broadcastForm.reset();
    } catch (error) {
      setActionError(error);
    }
  }

  function openSetting(setting: SettingRecord) {
    setActionError(null);
    setEditingSetting(setting);
    settingForm.reset({ value: setting.isSecret ? "" : setting.value, description: setting.description });
  }

  async function saveSetting(values: SettingFormValues) {
    if (!editingSetting || api.isPending) return;
    const parsed = settingSchema.parse(values);
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.updateSetting(editingSetting.key, parsed),
        {
          key: `setting-${editingSetting.key}`,
          progress: "جارٍ حفظ إعداد النظام…",
          success: "تم حفظ إعداد النظام بعد تأكيد الخادم.",
          error: errorMessage,
        },
      );
      setEditingSetting(null);
      settingForm.reset();
    } catch (error) {
      setActionError(error);
    }
  }

  function openSmsEditor() {
    const current = api.sms.result.data;
    if (!current) return;
    setActionError(null);
    smsForm.reset({
      provider: current.provider,
      apiKey: "",
      senderName: current.senderName ?? "",
      username: current.username ?? "",
      userSender: current.userSender ?? "",
    });
    setEditingSms(true);
  }

  async function saveSms(values: SmsConfigurationFormValues) {
    if (api.isPending) return;
    const parsed = smsConfigurationSchema.parse(values);
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.updateSms({
          provider: parsed.provider,
          ...(parsed.apiKey ? { apiKey: parsed.apiKey } : {}),
          senderName: parsed.senderName,
          username: parsed.username,
          userSender: parsed.userSender,
        }),
        {
          key: "sms-settings",
          progress: "جارٍ تحديث إعدادات بوابة الرسائل…",
          success: "تم تحديث إعدادات بوابة الرسائل دون عرض المفتاح السري.",
          error: errorMessage,
        },
      );
      setEditingSms(false);
      smsForm.reset();
    } catch (error) {
      setActionError(error);
    }
  }

  async function confirmOtpToggle() {
    if (otpTarget === null || api.isPending) return;
    const next = otpTarget;
    setActionError(null);
    try {
      await notification.trackPromise(
        () => api.setOtpEnabled(next),
        {
          key: "otp-setting",
          progress: "جارٍ تحديث وضع رسائل OTP…",
          success: next ? "تم تفعيل إرسال رموز OTP عبر بوابة الرسائل." : "تم تعطيل الإرسال الخارجي وتفعيل وضع الاختبار.",
          error: errorMessage,
        },
      );
      setOtpTarget(null);
    } catch (error) {
      setActionError(error);
    }
  }

  const settingsRows = api.settings.result.data ?? [];
  const otpSetting = settingsRows.find((setting) => setting.key === "is_otp_enabled");
  const otpEnabled = api.sms.result.data?.otpEnabled ?? parseBooleanSetting(otpSetting?.value);
  const settingsColumns = useMemo<DataTableColumn<SettingRecord>[]>(() => [
    { id: "key", header: "المفتاح", cell: (setting) => <code dir="ltr">{setting.key}</code> },
    { id: "description", header: "الوصف", cell: (setting) => setting.description || "—" },
    {
      id: "value",
      header: "القيمة",
      cell: (setting) => setting.isSecret
        ? <span className="secret-state"><LockKeyhole aria-hidden="true" size={14} />{setting.hasValue ? "مُعيّنة ومحجوبة" : "غير مُعيّنة"}</span>
        : <bdi dir="ltr">{setting.value || "—"}</bdi>,
    },
    { id: "updatedAt", header: "آخر تحديث", cell: (setting) => formatDate(setting.updatedAt) },
    {
      id: "action",
      header: "الإجراء",
      cell: (setting) => setting.key === "is_otp_enabled" || setting.key.startsWith("sms_")
        ? <span className="text-muted">يُدار أدناه</span>
        : <AuthorizedButton resource="settings" action="manage_settings" className="icon-button table-action" type="button" disabled={api.isPending} onClick={() => openSetting(setting)} aria-label={`تعديل ${setting.description || setting.key}`}><Pencil aria-hidden="true" size={16} /></AuthorizedButton>,
    },
  ], [api.isPending]);

  if (permissions.isPending) {
    return <section className="card route-state" role="status"><p>جارٍ التحقق من صلاحيات النظام…</p></section>;
  }

  return (
    <>
      <PageHeader title="الإشعارات وإعدادات النظام" description="إرسال التنبيهات العامة وإدارة إعدادات التشغيل ومراجعة سجل التدقيق وفق العقود المؤكدة." />

      <div className="segmented" role="tablist" aria-label="أقسام النظام">
        {canBroadcast && <button id="system-broadcast-tab" type="button" role="tab" tabIndex={tab === "broadcast" ? 0 : -1} aria-selected={tab === "broadcast"} aria-controls="system-broadcast-panel" className={tab === "broadcast" ? "active" : ""} onKeyDown={handleTabKey} onClick={() => setTab("broadcast")}><BellRing aria-hidden="true" size={17} />بث الإشعارات</button>}
        {canSettings && <button id="system-settings-tab" type="button" role="tab" tabIndex={tab === "settings" ? 0 : -1} aria-selected={tab === "settings"} aria-controls="system-settings-panel" className={tab === "settings" ? "active" : ""} onKeyDown={handleTabKey} onClick={() => setTab("settings")}><Settings aria-hidden="true" size={17} />إعدادات التشغيل</button>}
        {canAudit && <button id="system-audit-tab" type="button" role="tab" tabIndex={tab === "audit" ? 0 : -1} aria-selected={tab === "audit"} aria-controls="system-audit-panel" className={tab === "audit" ? "active" : ""} onKeyDown={handleTabKey} onClick={() => setTab("audit")}><History aria-hidden="true" size={17} />سجل التدقيق</button>}
      </div>

      {canBroadcast && tab === "broadcast" && (
        <div className="system-grid" id="system-broadcast-panel" role="tabpanel" aria-labelledby="system-broadcast-tab">
          <section className="card panel broadcast-form">
            <div className="panel-title"><div><h2>إنشاء إشعار عام</h2><p className="panel-copy">العقد الحالي يدعم الإرسال لجميع المستخدمين فقط.</p></div></div>
            <div className="contract-note"><Info aria-hidden="true" size={17} /><p>الاستهداف حسب المنطقة أو القرية غير مفعّل لأن حقول الجمهور غير موجودة في عقد الخادم التنفيذي.</p></div>
            <ValidatedForm onSubmit={broadcastForm.handleSubmit((values) => { setActionError(null); setBroadcastReview(values); })}>
              <TextField label="الجمهور المستهدف" value="جميع المستخدمين" readOnly aria-readonly="true" />
              <TextField label="عنوان الإشعار" maxLength={200} error={broadcastForm.formState.errors.title?.message} {...broadcastForm.register("title")} />
              <TextareaField label="نص الإشعار" rows={5} maxLength={1000} error={broadcastForm.formState.errors.body?.message} {...broadcastForm.register("body")} />
              <SubmitButton className="button" pending={false} disabled={api.isPending}><Send aria-hidden="true" size={17} />مراجعة الإرسال</SubmitButton>
            </ValidatedForm>
          </section>
          <aside className="card panel">
            <h2>معاينة الإشعار</h2>
            <div className="phone-preview"><div className="phone-status">9:41</div><div className="push-preview"><span className="brand-mark">ت</span><div><strong>{broadcastForm.watch("title") || "سوق تهامة"}</strong><p>{broadcastForm.watch("body") || "سيظهر نص الإشعار هنا قبل الإرسال."}</p><small>الآن</small></div></div></div>
            <div className="delivery-note"><ShieldCheck aria-hidden="true" size={18} /><div><strong>تأكيد خادمي مطلوب</strong><p>لن تظهر رسالة النجاح قبل استجابة الخادم، ولا تُفترض أعداد التسليم الفعلية.</p></div></div>
          </aside>
        </div>
      )}

      {canSettings && tab === "settings" && (
        <div className="settings-stack" id="system-settings-panel" role="tabpanel" aria-labelledby="system-settings-tab">
          <section className="card data-surface">
            <DataTable
              caption="إعدادات المنصة"
              columns={settingsColumns}
              rows={settingsRows}
              rowKey={(setting) => setting.id}
              loading={api.settings.query.isPending}
              error={api.settings.query.isError ? api.settings.query.error : undefined}
              onRetry={() => { void api.settings.query.refetch(); }}
              retrying={api.settings.query.isFetching}
              emptyMessage="لا توجد إعدادات نظام متاحة."
              toolbar={<div className="table-toolbar"><div><h2>إعدادات المنصة</h2><p className="panel-copy">القيم السرية تُحجب قبل وصولها إلى مكونات العرض.</p></div><span className="read-only"><ShieldCheck aria-hidden="true" size={15} />صلاحية مقيّدة</span></div>}
            />
          </section>

          <div className="system-grid">
            <section className="card panel settings-panel">
              <div className="panel-title"><div><h2>بوابة رسائل SMS</h2><p className="panel-copy">إعدادات الربط المؤكدة دون إظهار المفتاح السري.</p></div></div>
              {api.sms.query.isPending ? <p role="status">جارٍ تحميل إعدادات بوابة الرسائل…</p> : api.sms.query.isError ? <div className="alert-box danger" role="alert"><Info aria-hidden="true" size={18} /><div><strong>تعذر تحميل إعدادات SMS</strong><p>{errorMessage(api.sms.query.error)}</p><button className="button secondary" type="button" onClick={() => { void api.sms.query.refetch(); }}>إعادة المحاولة</button></div></div> : api.sms.result.data && <>
                <dl className="detail-grid compact-details">
                  <div><dt>المزود</dt><dd dir="ltr">{api.sms.result.data.provider}</dd></div>
                  <div><dt>اسم المرسل</dt><dd dir="ltr">{api.sms.result.data.senderName ?? "—"}</dd></div>
                  <div><dt>اسم المستخدم</dt><dd dir="ltr">{api.sms.result.data.username ?? "—"}</dd></div>
                  <div><dt>المفتاح السري</dt><dd>{api.sms.result.data.hasApiKey ? "مُعيّن ومحجوب" : "غير مُعيّن"}</dd></div>
                </dl>
                <AuthorizedButton resource="settings" action="manage_settings" className="button secondary" type="button" disabled={api.isPending} onClick={openSmsEditor}><Pencil aria-hidden="true" size={16} />تعديل إعدادات SMS</AuthorizedButton>
              </>}
              <div className="contract-note"><Info aria-hidden="true" size={17} /><p>اختبار SMS معطّل لأن Swagger يشير إلى <code dir="ltr">TestSMSRequest</code> من دون تعريف جسم الطلب، ومثال Postman يرسل جسماً فارغاً.</p></div>
              <button className="button secondary" type="button" disabled title="عقد جسم طلب الاختبار غير مؤكد"><MessageSquareText aria-hidden="true" size={16} />إرسال رسالة اختبار</button>
            </section>

            <section className="card panel settings-panel">
              <div className="panel-title"><div><h2>تشغيل رموز OTP</h2><p className="panel-copy">التبديل بين بوابة الرسائل الخارجية ووضع الاختبار.</p></div></div>
              <p className="setting-status">الحالة الحالية: <strong>{otpEnabled === null ? "غير متاحة" : otpEnabled ? "الإرسال الخارجي مفعّل" : "وضع الاختبار مفعّل"}</strong></p>
              {api.recipientMetrics.query.isSuccess && api.recipientMetrics.result.data.otpMessagesUsed !== null && api.recipientMetrics.result.data.otpMessagesQuota !== null
                ? <p>الاستهلاك: <strong>{api.recipientMetrics.result.data.otpMessagesUsed.toLocaleString("ar-SA")}</strong> من <strong>{api.recipientMetrics.result.data.otpMessagesQuota.toLocaleString("ar-SA")}</strong> رسالة.</p>
                : <p className="text-muted">حصة واستهلاك OTP غير متاحين في استجابة الإحصاءات الحالية.</p>}
              <AuthorizedButton resource="settings" action="manage_settings" className={`button ${otpEnabled ? "danger-button" : ""}`} type="button" disabled={api.isPending || otpEnabled === null} onClick={() => setOtpTarget(!otpEnabled)}>{otpEnabled ? "تعطيل الإرسال الخارجي" : "تفعيل الإرسال الخارجي"}</AuthorizedButton>
            </section>
          </div>
        </div>
      )}

      {canAudit && tab === "audit" && (
        <section className="card data-surface" id="system-audit-panel" role="tabpanel" aria-labelledby="system-audit-tab">
          <DataTable
            caption="سجل العمليات الإدارية للقراءة فقط"
            columns={auditColumns}
            rows={api.audit.result.data ?? []}
            rowKey={(log) => log.id}
            loading={api.audit.query.isPending}
            error={api.audit.query.isError ? api.audit.query.error : undefined}
            onRetry={() => { void api.audit.query.refetch(); }}
            retrying={api.audit.query.isFetching}
            emptyMessage="لا توجد عمليات تدقيق مطابقة."
            pagination={{ page: table.page, pageSize: table.pageSize, total: api.audit.result.total ?? 0, pageSizeOptions: table.pageSizeOptions }}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            toolbar={
              <div className="table-toolbar system-audit-toolbar">
                <div>
                  <h2>سجل العمليات الإدارية</h2>
                  <p className="panel-copy">محول قراءة محلي فقط حتى يؤكد الخادم مسار القائمة.</p>
                </div>
                <label className="field-with-icon">
                  <History aria-hidden="true" size={16} />
                  <input
                    value={table.search}
                    onChange={(event) => table.setSearch(event.target.value)}
                    aria-label="البحث في سجل التدقيق"
                    placeholder="الإجراء أو الكيان أو المشرف"
                  />
                </label>
                <div className="table-actions-group">
                  <span className="read-only">
                    <LockKeyhole aria-hidden="true" size={15} />Append-only
                  </span>
                  <ExportButton
                    filename="tihamah-audit-logs"
                    data={api.audit.result.data ?? []}
                    columns={auditExportColumns}
                  />
                </div>
              </div>
            }
          />
        </section>
      )}

      {permissions.isSuccess && availableTabs.length === 0 && <section className="card route-state" role="alert"><LockKeyhole aria-hidden="true" size={28} /><p>لا تتوفر أقسام نظامية ضمن صلاحيات حسابك الحالية.</p></section>}

      <Modal open={Boolean(broadcastReview)} title="تأكيد بث الإشعار العام" onClose={() => { if (!api.isPending) setBroadcastReview(null); }}>
        <div className="form-confirmation">
          <span className="form-confirmation-icon"><BellRing aria-hidden="true" size={22} /></span>
          <div className="confirmation-summary"><p><strong>الجمهور:</strong> جميع المستخدمين</p><p><strong>العنوان:</strong> {broadcastReview?.title}</p><p><strong>النص:</strong> {broadcastReview?.body}</p><p><strong>تقدير الحسابات:</strong> {api.recipientMetrics.query.isSuccess ? api.recipientMetrics.result.data.totalUsers.toLocaleString("ar-SA") : "غير متاح"}</p><small>هذا إجمالي حسابات تقريبي؛ عدد الأجهزة القابلة للتسليم يحدده الخادم وFCM.</small></div>
          {Boolean(actionError) && <p className="form-field-error" role="alert">{errorMessage(actionError)}</p>}
          <div className="modal-actions"><button className="button secondary" type="button" disabled={api.isPending} onClick={() => setBroadcastReview(null)}>العودة للتعديل</button><AuthorizedButton resource="notifications" action="broadcast" className="button danger-button" type="button" disabled={api.isPending} aria-busy={api.isPending} onClick={() => { void confirmBroadcast(); }}>{api.isPending ? "جارٍ الإرسال…" : "تأكيد الإرسال للجميع"}</AuthorizedButton></div>
        </div>
      </Modal>

      <FormDialog open={Boolean(editingSetting)} title={`تعديل إعداد: ${editingSetting?.key ?? ""}`} dirty={settingForm.formState.isDirty} submitting={api.isPending} onClose={() => { setEditingSetting(null); settingForm.reset(); }}>
        {(requestClose) => <ValidatedForm className="validated-form" onSubmit={settingForm.handleSubmit((values) => { void saveSetting(values); })}>
          <TextField label="القيمة الجديدة" type={editingSetting?.isSecret ? "password" : "text"} autoComplete="off" hint={editingSetting?.isSecret ? "القيمة الحالية محجوبة؛ اكتب قيمة بديلة كاملة." : undefined} error={settingForm.formState.errors.value?.message} {...settingForm.register("value")} />
          <TextareaField label="الوصف" rows={3} maxLength={255} error={settingForm.formState.errors.description?.message} {...settingForm.register("description")} />
          {Boolean(actionError) && <p className="form-field-error" role="alert">{errorMessage(actionError)}</p>}
          <div className="modal-actions"><button className="button secondary" type="button" disabled={api.isPending} onClick={requestClose}>إلغاء</button><SubmitButton className="button" pending={api.isPending} pendingLabel="جارٍ الحفظ…">حفظ الإعداد</SubmitButton></div>
        </ValidatedForm>}
      </FormDialog>

      <FormDialog open={editingSms} title="تعديل إعدادات بوابة SMS" dirty={smsForm.formState.isDirty} submitting={api.isPending} onClose={() => { setEditingSms(false); smsForm.reset(); }}>
        {(requestClose) => <ValidatedForm className="validated-form" onSubmit={smsForm.handleSubmit((values) => { void saveSms(values); })}>
          <TextField label="مزود الرسائل" dir="ltr" error={smsForm.formState.errors.provider?.message} {...smsForm.register("provider")} />
          <TextField label="مفتاح API جديد" type="password" dir="ltr" autoComplete="new-password" hint="اتركه فارغاً للإبقاء على المفتاح الحالي؛ لن تُعرض قيمته الحالية." error={smsForm.formState.errors.apiKey?.message} {...smsForm.register("apiKey")} />
          <TextField label="اسم المرسل" dir="ltr" error={smsForm.formState.errors.senderName?.message} {...smsForm.register("senderName")} />
          <TextField label="اسم مستخدم البوابة" dir="ltr" autoComplete="off" error={smsForm.formState.errors.username?.message} {...smsForm.register("username")} />
          <TextField label="معرّف مرسل المستخدم" dir="ltr" error={smsForm.formState.errors.userSender?.message} {...smsForm.register("userSender")} />
          {Boolean(actionError) && <p className="form-field-error" role="alert">{errorMessage(actionError)}</p>}
          <div className="modal-actions"><button className="button secondary" type="button" disabled={api.isPending} onClick={requestClose}>إلغاء</button><SubmitButton className="button" pending={api.isPending} pendingLabel="جارٍ الحفظ…">حفظ إعدادات SMS</SubmitButton></div>
        </ValidatedForm>}
      </FormDialog>

      <Modal open={otpTarget !== null} title="تأكيد تغيير وضع OTP" onClose={() => { if (!api.isPending) setOtpTarget(null); }}>
        <div className="form-confirmation"><span className="form-confirmation-icon"><MessageSquareText aria-hidden="true" size={22} /></span><p>{otpTarget ? "سيتم تفعيل إرسال رموز OTP الفعلية عبر بوابة الرسائل وقد يستهلك ذلك الرصيد المتاح." : "سيتم إيقاف إرسال الرسائل الخارجية واستخدام وضع الاختبار وفق إعداد الخادم."}</p>{Boolean(actionError) && <p className="form-field-error" role="alert">{errorMessage(actionError)}</p>}<div className="modal-actions"><button className="button secondary" type="button" disabled={api.isPending} onClick={() => setOtpTarget(null)}>إلغاء</button><AuthorizedButton resource="settings" action="manage_settings" className="button danger-button" type="button" disabled={api.isPending} aria-busy={api.isPending} onClick={() => { void confirmOtpToggle(); }}>{api.isPending ? "جارٍ التحديث…" : "تأكيد تغيير الوضع"}</AuthorizedButton></div></div>
      </Modal>
    </>
  );
}
