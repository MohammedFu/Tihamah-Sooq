import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronLeft,
  Info,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import {
  FormDialog,
  SubmitButton,
  TextField,
  ValidatedForm,
} from "../../../components/ui/forms";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAdminNotification } from "../../../providers/notificationStore";
import { ApiError } from "../../../services/http";
import type { Region, Village } from "../../../types/domain";
import { useLocations } from "../api/useLocations";
import {
  regionSchema,
  villageSchema,
  type RegionFormValues,
  type VillageFormValues,
} from "../schemas/locationSchema";

type RegionEditor = {
  type: "region";
  mode: "create" | "edit";
  region?: Region;
};

type VillageEditor = {
  type: "village";
  mode: "create" | "edit";
  regionId: number;
  village?: Village;
};

type EditorState = RegionEditor | VillageEditor | null;

type DeleteTarget =
  | { type: "region"; region: Region }
  | { type: "village"; village: Village; regionName: string }
  | null;

function formatErrorMessage(error: unknown, action: "create" | "update" | "delete"): string {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.statusCode === 409) {
      if (action === "delete") {
        return "لا يمكن الحذف لوجود ارتباطات نشطة (قرى، مستخدمين، أو إعلانات) بهذا الموقع.";
      }
      return "الاسم المدخل موجود مسبقاً في هذا النطاق الجغرافي. يرجى اختيار اسم مختلف.";
    }
    if (error.status === 422 || error.statusCode === 422) {
      return "البيانات المدخلة غير صالحة أو المنطقة المحددة غير موجودة.";
    }
    return error.userMessage;
  }
  if (error instanceof Error) return error.message;
  return "تعذر إكمال العملية، يرجى المحاولة مرة أخرى.";
}

export function LocationsPage() {
  const {
    regionsList,
    isPending,
    createRegion,
    updateRegion,
    deleteRegion,
    createVillage,
    updateVillage,
    deleteVillage,
  } = useLocations();

  const notification = useAdminNotification();
  const regions = regionsList.result.data ?? [];
  const loading = regionsList.query.isPending;
  const error = regionsList.query.isError ? regionsList.query.error : null;

  const [expanded, setExpanded] = useState<number[]>([]);
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initialize expanded state once regions are loaded
  useEffect(() => {
    if (!hasInitializedExpanded && regions.length > 0) {
      setExpanded(regions.map((r) => r.id));
      setHasInitializedExpanded(true);
    }
  }, [regions, hasInitializedExpanded]);

  // Forms
  const regionForm = useForm<RegionFormValues>({
    resolver: zodResolver(regionSchema),
    defaultValues: { name: "", isActive: true },
  });

  const villageForm = useForm<VillageFormValues>({
    resolver: zodResolver(villageSchema),
    defaultValues: { regionId: 1, name: "", isActive: true },
  });

  function openCreateRegion() {
    setActionError(null);
    regionForm.reset({ name: "", isActive: true });
    setEditor({ type: "region", mode: "create" });
  }

  function openEditRegion(region: Region) {
    setActionError(null);
    regionForm.reset({ name: region.name, isActive: region.isActive });
    setEditor({ type: "region", mode: "edit", region });
  }

  function openCreateVillage(regionId: number) {
    setActionError(null);
    villageForm.reset({ regionId, name: "", isActive: true });
    setEditor({ type: "village", mode: "create", regionId });
  }

  function openEditVillage(regionId: number, village: Village) {
    setActionError(null);
    villageForm.reset({ regionId, name: village.name, isActive: village.isActive });
    setEditor({ type: "village", mode: "edit", regionId, village });
  }

  function closeEditor() {
    if (isPending) return;
    setEditor(null);
    setActionError(null);
    regionForm.reset();
    villageForm.reset();
  }

  function closeDeleteModal() {
    if (isPending) return;
    setDeleteTarget(null);
    setActionError(null);
  }

  async function handleSaveRegion(values: RegionFormValues) {
    if (!editor || editor.type !== "region") return;
    setActionError(null);
    try {
      if (editor.mode === "create") {
        const created = await createRegion({ name: values.name, isActive: values.isActive ?? true });
        notification.success(`تمت إضافة المنطقة «${values.name}» بنجاح.`);
        if (created?.id) {
          setExpanded((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
        }
      } else if (editor.region) {
        await updateRegion(editor.region.id, { name: values.name, isActive: values.isActive ?? true });
        notification.success(`تم تحديث بيانات المنطقة «${values.name}» بنجاح.`);
      }
      closeEditor();
    } catch (err) {
      setActionError(formatErrorMessage(err, editor.mode === "create" ? "create" : "update"));
    }
  }

  async function handleSaveVillage(values: VillageFormValues) {
    if (!editor || editor.type !== "village") return;
    setActionError(null);
    try {
      if (editor.mode === "create") {
        await createVillage({
          regionId: values.regionId,
          name: values.name,
          isActive: values.isActive ?? true,
        });
        notification.success(`تمت إضافة القرية «${values.name}» بنجاح.`);
        setExpanded((prev) => (prev.includes(values.regionId) ? prev : [...prev, values.regionId]));
      } else if (editor.village) {
        await updateVillage(editor.village.id, {
          regionId: values.regionId,
          name: values.name,
          isActive: values.isActive ?? true,
        });
        notification.success(`تم تحديث بيانات القرية «${values.name}» بنجاح.`);
      }
      closeEditor();
    } catch (err) {
      setActionError(formatErrorMessage(err, editor.mode === "create" ? "create" : "update"));
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      if (deleteTarget.type === "region") {
        if (deleteTarget.region.villages && deleteTarget.region.villages.length > 0) {
          return;
        }
        await deleteRegion(deleteTarget.region.id);
        notification.success(`تم حذف المنطقة «${deleteTarget.region.name}» بنجاح.`);
      } else {
        await deleteVillage(deleteTarget.village.id);
        notification.success(`تم حذف القرية «${deleteTarget.village.name}» بنجاح.`);
      }
      closeDeleteModal();
    } catch (err) {
      setActionError(formatErrorMessage(err, "delete"));
    }
  }

  // Filtered regions based on search
  const filteredRegions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return regions;
    return regions
      .map((region) => {
        const regionMatches = region.name.toLowerCase().includes(q);
        const matchingVillages = (region.villages ?? []).filter((v) =>
          v.name.toLowerCase().includes(q),
        );
        if (regionMatches) return region;
        if (matchingVillages.length > 0) {
          return { ...region, villages: matchingVillages };
        }
        return null;
      })
      .filter((r): r is Region => r !== null);
  }, [regions, search]);

  const totalVillages = useMemo(
    () => regions.reduce((sum, r) => sum + (r.villages?.length ?? 0), 0),
    [regions],
  );

  return (
    <>
      <PageHeader
        title="المناطق والقرى"
        description="إدارة الهيكل الجغرافي للمنصة الذي يغذي تسجيل المشتركين وفلاتر الإعلانات في تطبيق الموبايل."
        action={
          <AuthorizedButton
            resource="regions"
            action="create"
            className="button"
            type="button"
            onClick={openCreateRegion}
          >
            <Plus size={17} />
            إضافة منطقة
          </AuthorizedButton>
        }
      />

      <div className="location-layout">
        <section className="card tree-panel">
          <div className="panel-title">
            <div>
              <h2>شجرة المواقع</h2>
              <p className="panel-copy">
                {regions.length} مناطق · {totalVillages} قرية
              </p>
            </div>
            <div style={{ minWidth: "220px" }}>
              <label className="field-with-icon" style={{ margin: 0 }}>
                <Search aria-hidden="true" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="تصفية بالاسم…"
                  aria-label="تصفية شجرة المناطق والقرى"
                />
              </label>
            </div>
          </div>

          {loading && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
              <p>جارٍ تحميل شجرة المناطق والقرى…</p>
            </div>
          )}

          {error && !loading && (
            <div className="alert-box danger" role="alert" style={{ margin: "16px" }}>
              <Info aria-hidden="true" size={18} />
              <div>
                <strong>تعذر تحميل المواقع</strong>
                <p>{error instanceof ApiError ? error.userMessage : "حدث خطأ أثناء تحميل البيانات."}</p>
              </div>
              <button
                className="button secondary"
                type="button"
                onClick={() => void regionsList.query.refetch()}
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !error && filteredRegions.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
              <p>{search ? "لا توجد نتائج مطابقة لبحثك." : "لا توجد مناطق جغرافية مسجلة حالياً."}</p>
            </div>
          )}

          {!loading && !error && filteredRegions.length > 0 && (
            <div className="tree-list">
              {filteredRegions.map((region) => {
                const isExpanded = expanded.includes(region.id) || Boolean(search.trim());
                const villagesId = `region-${region.id}-villages`;
                const villages = region.villages ?? [];

                return (
                  <article className="tree-region" key={region.id}>
                    <div className="tree-region-row">
                      <button
                        className="tree-toggle"
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={isExpanded ? villagesId : undefined}
                        onClick={() =>
                          setExpanded((ids) =>
                            ids.includes(region.id)
                              ? ids.filter((id) => id !== region.id)
                              : [...ids, region.id],
                          )
                        }
                      >
                        {isExpanded ? (
                          <ChevronDown aria-hidden="true" size={18} />
                        ) : (
                          <ChevronLeft aria-hidden="true" size={18} />
                        )}
                        <MapPin aria-hidden="true" size={18} />
                        <span>
                          <strong>{region.name}</strong>
                          <small>{villages.length} قرى</small>
                        </span>
                      </button>

                      <div className="row-actions">
                        <StatusBadge value={region.isActive ? "enabled" : "disabled"} />
                        <AuthorizedButton
                          resource="regions"
                          action="edit"
                          className="icon-button table-action"
                          type="button"
                          disabled={isPending}
                          onClick={() => openEditRegion(region)}
                          aria-label={`تعديل منطقة ${region.name}`}
                          title="تعديل المنطقة"
                        >
                          <Pencil aria-hidden="true" size={15} />
                        </AuthorizedButton>
                        <AuthorizedButton
                          resource="villages"
                          action="create"
                          className="icon-button table-action"
                          type="button"
                          disabled={isPending}
                          onClick={() => openCreateVillage(region.id)}
                          aria-label={`إضافة قرية إلى ${region.name}`}
                          title="إضافة قرية"
                        >
                          <Plus aria-hidden="true" size={16} />
                        </AuthorizedButton>
                        <AuthorizedButton
                          resource="regions"
                          action="delete"
                          className="icon-button table-action danger-icon"
                          type="button"
                          disabled={isPending}
                          onClick={() => setDeleteTarget({ type: "region", region })}
                          aria-label={`حذف منطقة ${region.name}`}
                          title="حذف المنطقة"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </AuthorizedButton>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="village-list" id={villagesId}>
                        {villages.length === 0 ? (
                          <div style={{ padding: "12px 0", color: "var(--color-text-subtle)", fontSize: "12px" }}>
                            لا توجد قرى مضافة إلى هذه المنطقة بعد.
                          </div>
                        ) : (
                          villages.map((village, index) => (
                            <div className="village-row" key={village.id}>
                              <span className="order-index">{index + 1}</span>
                              <span className="village-name">
                                <strong>{village.name}</strong>
                              </span>
                              <StatusBadge value={village.isActive ? "enabled" : "disabled"} />
                              <div className="row-actions">
                                <AuthorizedButton
                                  resource="villages"
                                  action="edit"
                                  className="icon-button table-action"
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => openEditVillage(region.id, village)}
                                  aria-label={`تعديل قرية ${village.name}`}
                                  title="تعديل القرية"
                                >
                                  <Pencil aria-hidden="true" size={15} />
                                </AuthorizedButton>
                                <AuthorizedButton
                                  resource="villages"
                                  action="delete"
                                  className="icon-button table-action danger-icon"
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "village",
                                      village,
                                      regionName: region.name,
                                    })
                                  }
                                  aria-label={`حذف قرية ${village.name}`}
                                  title="حذف القرية"
                                >
                                  <Trash2 aria-hidden="true" size={15} />
                                </AuthorizedButton>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="card panel integrity-panel">
          <h2>سلامة البيانات والجغرافيا</h2>
          <p className="panel-copy">
            حذف المناطق والقرى يخضع لقيود تكامل البيانات الصارمة. لا يمكن حذف منطقة تحتوي على قرى،
            كما تُمنع إزالة أي قرية ترتبط بحسابات مستخدمين أو إعلانات نشطة في سوق تهامة.
          </p>
          <div className="integrity-stat">
            <strong>{totalVillages}</strong>
            <span>إجمالي القرى المسجلة عبر {regions.length} مناطق</span>
          </div>
          <div className="api-note">
            <small>نقاط الربط المعتمدة</small>
            <code>GET /api/v1/admin/regions</code>
            <code>GET /api/v1/admin/villages</code>
          </div>
        </aside>
      </div>

      {/* Region Editor Dialog */}
      <FormDialog
        open={Boolean(editor && editor.type === "region")}
        title={editor?.mode === "edit" ? "تعديل المنطقة الجغرافية" : "إضافة منطقة جغرافية"}
        dirty={regionForm.formState.isDirty}
        submitting={isPending}
        onClose={closeEditor}
      >
        {(requestClose) => (
          <ValidatedForm
            className="validated-form"
            onSubmit={regionForm.handleSubmit(handleSaveRegion)}
          >
            {actionError && (
              <div className="alert-box danger" role="alert">
                <Info aria-hidden="true" size={18} />
                <p>{actionError}</p>
              </div>
            )}
            <TextField
              label="اسم المنطقة بالعربية"
              placeholder="مثال: جازان - تهامة"
              error={regionForm.formState.errors.name?.message}
              autoFocus
              {...regionForm.register("name")}
            />
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                margin: "8px 0 16px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              <input
                type="checkbox"
                {...regionForm.register("isActive")}
              />
              <span>تفعيل المنطقة في تطبيق الموبايل</span>
            </label>
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                disabled={isPending}
                onClick={requestClose}
              >
                إلغاء
              </button>
              <SubmitButton
                className="button"
                pending={isPending}
                pendingLabel="جارٍ الحفظ…"
              >
                {editor?.mode === "edit" ? "حفظ التعديلات" : "إضافة المنطقة"}
              </SubmitButton>
            </div>
          </ValidatedForm>
        )}
      </FormDialog>

      {/* Village Editor Dialog */}
      <FormDialog
        open={Boolean(editor && editor.type === "village")}
        title={editor?.mode === "edit" ? "تعديل القرية الريفية" : "إضافة قرية ريفية جديدة"}
        dirty={villageForm.formState.isDirty}
        submitting={isPending}
        onClose={closeEditor}
      >
        {(requestClose) => (
          <ValidatedForm
            className="validated-form"
            onSubmit={villageForm.handleSubmit(handleSaveVillage)}
          >
            {actionError && (
              <div className="alert-box danger" role="alert">
                <Info aria-hidden="true" size={18} />
                <p>{actionError}</p>
              </div>
            )}
            <div className="form-field">
              <label htmlFor="village-region-select" className="field-label">
                المنطقة التابعة
              </label>
              <select
                id="village-region-select"
                className="field-control"
                {...villageForm.register("regionId", { valueAsNumber: true })}
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {villageForm.formState.errors.regionId && (
                <span className="field-error" role="alert">
                  {villageForm.formState.errors.regionId.message}
                </span>
              )}
            </div>

            <TextField
              label="اسم القرية بالعربية"
              placeholder="مثال: قرية المضايا"
              error={villageForm.formState.errors.name?.message}
              autoFocus
              {...villageForm.register("name")}
            />

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                margin: "8px 0 16px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              <input
                type="checkbox"
                {...villageForm.register("isActive")}
              />
              <span>تفعيل القرية في القوائم وفلاتر الإعلانات</span>
            </label>

            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                disabled={isPending}
                onClick={requestClose}
              >
                إلغاء
              </button>
              <SubmitButton
                className="button"
                pending={isPending}
                pendingLabel="جارٍ الحفظ…"
              >
                {editor?.mode === "edit" ? "حفظ التعديلات" : "إضافة القرية"}
              </SubmitButton>
            </div>
          </ValidatedForm>
        )}
      </FormDialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.type === "region"
            ? (deleteTarget.region.villages?.length ?? 0) > 0
              ? "تعذر حذف المنطقة"
              : "حذف المنطقة الجغرافية"
            : "حذف القرية الريفية"
        }
        intent={
          deleteTarget?.type === "region" && (deleteTarget.region.villages?.length ?? 0) > 0
            ? "warning"
            : "danger"
        }
        icon={<Trash2 aria-hidden="true" size={22} />}
        hideConfirm={deleteTarget?.type === "region" && (deleteTarget.region.villages?.length ?? 0) > 0}
        cancelLabel={
          deleteTarget?.type === "region" && (deleteTarget.region.villages?.length ?? 0) > 0
            ? "إغلاق"
            : "إلغاء"
        }
        confirmLabel="تأكيد الحذف"
        pendingLabel="جارٍ الحذف…"
        submitting={isPending}
        resource={deleteTarget?.type === "region" ? "regions" : "villages"}
        action="delete"
        error={actionError}
        description={
          deleteTarget?.type === "region" ? (
            (deleteTarget.region.villages?.length ?? 0) > 0 ? (
              <div>
                <p>
                  لا يمكن حذف المنطقة «<strong>{deleteTarget.region.name}</strong>» لوجود{" "}
                  <strong>{deleteTarget.region.villages.length}</strong> قرى تابعة لها.
                </p>
                <p className="block-copy text-muted" style={{ marginTop: "8px" }}>
                  يجب حذف أو نقل جميع القرى التابعة أولاً لمنع تعليق بيانات الإعلانات والمستخدمين.
                </p>
              </div>
            ) : (
              <p>
                هل أنت متأكد من رغبتك في حذف المنطقة «
                <strong>{deleteTarget.region.name}</strong>»؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            )
          ) : deleteTarget?.type === "village" ? (
            <p>
              هل أنت متأكد من رغبتك في حذف قرية «<strong>{deleteTarget.village.name}</strong>»
              التابعة لمنطقة «<strong>{deleteTarget.regionName}</strong>»؟
            </p>
          ) : undefined
        }
        onConfirm={() => void handleDeleteConfirm()}
        onClose={closeDeleteModal}
      />
    </>
  );
}
