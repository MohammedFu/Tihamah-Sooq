import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  ImagePlus,
  Info,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import {
  FormDialog,
  SubmitButton,
  TextField,
  ValidatedForm,
} from "../../../components/ui/forms";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAdminNotification } from "../../../providers/notificationStore";
import { ApiError } from "../../../services/http";
import type { Banner } from "../../../types/domain";
import { useBanners } from "../api/useBanners";
import {
  bannerSchema,
  getBannerLifecycleState,
  targetTypeLabels,
  type BannerFormValues,
} from "../schemas/bannerSchema";

const PRESET_BANNER_IMAGES = [
  {
    label: "موسم عسل السدر",
    url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "سوق المواشي الريفي",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "المنتجات الزراعية والمحاصيل",
    url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=80",
  },
] as const;

function formatBannerErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.statusCode === 409) {
      return "يوجد تعارض في بيانات البنر. يرجى مراجعة المدخلات والمحاولة مجدداً.";
    }
    if (error.status === 422 || error.statusCode === 422) {
      return "البيانات المدخلة غير صالحة. يرجى التأكد من صحة الرابط والحقول.";
    }
    return error.userMessage;
  }
  if (error instanceof Error) return error.message;
  return "تعذر إكمال العملية، يرجى التحقق من الاتصال والمحاولة مرة أخرى.";
}

type EditorMode = "create" | "edit";

export function BannersPage() {
  const {
    bannersList,
    isPending,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBannerActive,
    reorderBanners,
  } = useBanners();

  const notification = useAdminNotification();
  const rawBanners = bannersList.result.data ?? [];
  const loading = bannersList.query.isPending;
  const error = bannersList.query.isError ? bannersList.query.error : null;

  const [search, setSearch] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      sortOrder: 0,
      isActive: true,
      targetType: "none",
      targetId: null,
      startsAt: "",
      endsAt: "",
    },
    mode: "onBlur",
  });

  const watchImageUrl = form.watch("imageUrl");
  const watchTargetType = form.watch("targetType");

  // Sorted list of banners by sortOrder
  const sortedBanners = useMemo(() => {
    return [...rawBanners].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [rawBanners]);

  // Filtered by search query
  const filteredBanners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedBanners;
    return sortedBanners.filter((banner) => {
      const idMatch = String(banner.id).includes(q);
      const titleMatch = banner.title?.toLowerCase().includes(q) ?? false;
      const targetMatch = banner.targetId ? String(banner.targetId).includes(q) : false;
      return idMatch || titleMatch || targetMatch;
    });
  }, [sortedBanners, search]);

  // Lifecycle counts
  const { activeCount, scheduledCount, expiredCount } = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    for (const b of rawBanners) {
      const state = getBannerLifecycleState(b);
      if (state === "active") active++;
      else if (state === "scheduled") scheduled++;
      else if (state === "expired") expired++;
    }
    return { activeCount: active, scheduledCount: scheduled, expiredCount: expired };
  }, [rawBanners]);

  function openCreateEditor() {
    setEditingBanner(null);
    setEditorMode("create");
    setActionError(null);
    form.reset({
      imageUrl: "",
      title: "",
      sortOrder: rawBanners.length + 1,
      isActive: true,
      targetType: "none",
      targetId: null,
      startsAt: "",
      endsAt: "",
    });
  }

  function openEditEditor(banner: Banner) {
    setEditingBanner(banner);
    setEditorMode("edit");
    setActionError(null);
    form.reset({
      imageUrl: banner.imageUrl,
      title: banner.title ?? "",
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      targetType: banner.targetType ?? "none",
      targetId: banner.targetId ?? null,
      startsAt: banner.startsAt ? banner.startsAt.slice(0, 10) : "",
      endsAt: banner.endsAt ? banner.endsAt.slice(0, 10) : "",
    });
  }

  function closeEditor() {
    setEditorMode(null);
    setEditingBanner(null);
    setActionError(null);
  }

  async function handleSave(values: BannerFormValues) {
    setActionError(null);
    try {
      if (editorMode === "create") {
        await createBanner({
          imageUrl: values.imageUrl,
          sortOrder: values.sortOrder,
          isActive: values.isActive,
        });
        notification.success("تم إضافة البنر الترويجي بنجاح.");
      } else if (editorMode === "edit" && editingBanner) {
        await updateBanner(Number(editingBanner.id), {
          imageUrl: values.imageUrl,
          sortOrder: values.sortOrder,
          isActive: values.isActive,
        });
        notification.success("تم تحديث بيانات البنر الترويجي بنجاح.");
      }
      closeEditor();
    } catch (err) {
      // Retain form values on error
      setActionError(formatBannerErrorMessage(err));
    }
  }

  async function handleToggle(banner: Banner) {
    try {
      await toggleBannerActive(banner);
      notification.success(
        banner.isActive ? "تم تعطيل البنر الترويجي." : "تم تفعيل البنر الترويجي.",
      );
    } catch (err) {
      notification.error(formatBannerErrorMessage(err));
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedBanners.length) return;
    const bannerA = sortedBanners[index];
    const bannerB = sortedBanners[targetIndex];
    try {
      await reorderBanners(bannerA, bannerB.sortOrder, bannerB, bannerA.sortOrder);
      notification.success("تم تحديث ترتيب البنرات الترويجية.");
    } catch (err) {
      notification.error(formatBannerErrorMessage(err));
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteBanner(Number(deleteTarget.id));
      notification.success("تم حذف البنر الترويجي بنجاح.");
      setDeleteTarget(null);
    } catch (err) {
      notification.error(formatBannerErrorMessage(err));
    }
  }

  function renderTargetInfo(banner: Banner) {
    if (!banner.targetType || banner.targetType === "none") {
      return "بدون توجيه";
    }
    if (banner.targetType === "category") {
      return `قسم #${banner.targetId ?? "عام"}`;
    }
    return `إعلان #${banner.targetId ?? ""}`;
  }

  return (
    <>
      <PageHeader
        title="البنرات الترويجية"
        description="إدارة صور الصفحة الرئيسية وروابطها وفترات ظهورها في تطبيق الموبايل."
        action={
          <AuthorizedButton
            resource="banners"
            action="create"
            className="button"
            type="button"
            onClick={openCreateEditor}
          >
            <Plus size={17} />
            إضافة بنر
          </AuthorizedButton>
        }
      />

      <div className="banner-summary">
        <span>
          <ImagePlus size={18} />
          <strong>{activeCount}</strong> بنرات مفعلة
        </span>
        <span>
          <CalendarDays size={18} />
          <strong>{scheduledCount}</strong> مجدولة
        </span>
        <span>
          <Clock size={18} />
          <strong>{expiredCount}</strong> منتهية الصلاحية
        </span>
      </div>

      <div className="filters-row" style={{ marginBottom: "16px", background: "var(--color-surface)", borderRadius: "var(--radius-sm)" }}>
        <div className="field-with-icon" style={{ position: "relative" }}>
          <Search
            aria-hidden="true"
            size={18}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-subtle)",
            }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم البنر أو العنوان أو الوجهة..."
            aria-label="بحث في البنرات الترويجية"
            style={{ paddingRight: "38px" }}
          />
        </div>
      </div>

      {loading && (
        <div className="banner-grid" data-testid="banners-loading-grid">
          {[1, 2].map((k) => (
            <div
              key={k}
              className="card banner-card"
              style={{ minHeight: "260px", opacity: 0.6 }}
            >
              <div
                className="banner-image"
                style={{
                  background:
                    "linear-gradient(90deg, var(--color-surface-subtle) 25%, var(--color-surface-muted) 50%, var(--color-surface-subtle) 75%)",
                  backgroundSize: "200% 100%",
                }}
              />
              <div className="banner-content">
                <div style={{ height: "20px", background: "var(--color-surface-muted)", borderRadius: "4px" }} />
                <div style={{ height: "14px", width: "60%", background: "var(--color-surface-muted)", borderRadius: "4px" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div
          className="alert-box danger"
          role="alert"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <Info size={28} />
          <p style={{ fontWeight: 600 }}>تعذر تحميل قائمة البنرات الترويجية.</p>
          <button
            className="button secondary"
            type="button"
            onClick={() => void bannersList.query.refetch()}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && !error && filteredBanners.length === 0 && (
        <div className="card empty" style={{ padding: "48px 24px", textAlign: "center" }}>
          <ImagePlus size={40} style={{ color: "var(--color-text-subtle)", margin: "0 auto 12px" }} />
          <h3>{search ? "لا توجد بنرات مطابقة لبحثك." : "لا توجد بنرات ترويجية حالياً."}</h3>
          <p style={{ color: "var(--color-text-muted)", marginTop: "4px", fontSize: "13px" }}>
            {search
              ? "جرّب تغيير كلمات البحث أو مسح حقل البحث لعرض كافة البنرات."
              : "ابدأ بإضافة أول بنر ترويجي للظهور في واجهة تطبيق الموبايل."}
          </p>
          {!search && (
            <div style={{ marginTop: "16px" }}>
              <AuthorizedButton
                resource="banners"
                action="create"
                className="button primary"
                type="button"
                onClick={openCreateEditor}
              >
                <Plus size={16} />
                إضافة بنر
              </AuthorizedButton>
            </div>
          )}
        </div>
      )}

      {!loading && !error && filteredBanners.length > 0 && (
        <section className="banner-grid" aria-label="قائمة البنرات الترويجية">
          {filteredBanners.map((banner, index) => {
            const lifecycleState = getBannerLifecycleState(banner);
            const bannerTitle = banner.title || `بنر ترويجي #${banner.id}`;

            return (
              <article className="card banner-card" key={banner.id}>
                {/* 16:6 Mobile-oriented preview wrapper */}
                <div className="banner-image" style={{ aspectRatio: "16 / 6", height: "auto", minHeight: "140px" }}>
                  <img
                    src={banner.imageUrl}
                    alt={bannerTitle}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80";
                    }}
                  />
                  <span>ترتيب {banner.sortOrder}</span>
                </div>

                <div className="banner-content">
                  <div className="detail-title-row">
                    <div>
                      <h2>{bannerTitle}</h2>
                      <p className="panel-copy">
                        بنر <bdi dir="ltr">#{banner.id}</bdi>
                      </p>
                    </div>
                    <StatusBadge value={lifecycleState} />
                  </div>

                  <div className="banner-meta">
                    <span>
                      <Link2 aria-hidden="true" size={15} />
                      {targetTypeLabels[banner.targetType ?? "none"]}: {renderTargetInfo(banner)}
                    </span>
                    <span>
                      <CalendarDays aria-hidden="true" size={15} />
                      {banner.startsAt ? banner.startsAt.slice(0, 10) : "فوري"} -{" "}
                      {banner.endsAt ? banner.endsAt.slice(0, 10) : "مستمر"}
                    </span>
                  </div>

                  <div className="banner-actions">
                    <AuthorizedButton
                      resource="banners"
                      action="edit"
                      className="icon-button"
                      type="button"
                      disabled={index === 0 || isPending}
                      onClick={() => handleMove(index, -1)}
                      aria-label={`تحريك ${bannerTitle} للأعلى`}
                    >
                      <ChevronUp aria-hidden="true" size={17} />
                    </AuthorizedButton>

                    <AuthorizedButton
                      resource="banners"
                      action="edit"
                      className="icon-button"
                      type="button"
                      disabled={index === filteredBanners.length - 1 || isPending}
                      onClick={() => handleMove(index, 1)}
                      aria-label={`تحريك ${bannerTitle} للأسفل`}
                    >
                      <ChevronDown aria-hidden="true" size={17} />
                    </AuthorizedButton>

                    <AuthorizedButton
                      resource="banners"
                      action="edit"
                      className={`switch ${banner.isActive ? "on" : ""}`}
                      type="button"
                      role="switch"
                      aria-checked={banner.isActive}
                      disabled={isPending}
                      onClick={() => handleToggle(banner)}
                      aria-label={`تغيير حالة ${bannerTitle}`}
                    >
                      <i />
                    </AuthorizedButton>

                    <span className="spacer" />

                    <AuthorizedButton
                      resource="banners"
                      action="edit"
                      className="icon-button"
                      type="button"
                      disabled={isPending}
                      onClick={() => openEditEditor(banner)}
                      aria-label={`تعديل ${bannerTitle}`}
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </AuthorizedButton>

                    <AuthorizedButton
                      resource="banners"
                      action="delete"
                      className="icon-button danger-icon"
                      type="button"
                      disabled={isPending}
                      onClick={() => setDeleteTarget(banner)}
                      aria-label={`حذف ${bannerTitle}`}
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </AuthorizedButton>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Create / Edit FormDialog */}
      <FormDialog
        open={Boolean(editorMode)}
        title={editorMode === "create" ? "إضافة بنر جديد" : "تعديل البنر"}
        dirty={form.formState.isDirty}
        submitting={isPending}
        onClose={closeEditor}
      >
        {(requestClose) => (
          <ValidatedForm
            className="validated-form"
            onSubmit={form.handleSubmit(handleSave)}
          >
            {actionError && (
              <div
                className="alert-box danger"
                role="alert"
                style={{ marginBottom: "16px" }}
              >
                <Info aria-hidden="true" size={18} />
                <p>{actionError}</p>
              </div>
            )}

            {/* Live Image Preview (16:6) */}
            {watchImageUrl && (
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "6px" }}>
                  معاينة مظهر البنر لشاشة الموبايل (16:6)
                </label>
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "16 / 6",
                    maxHeight: "140px",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    background: "var(--color-surface-muted)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <img
                    src={watchImageUrl}
                    alt="معاينة البنر"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}

            <TextField
              label="رابط صورة البنر *"
              placeholder="https://cdn.tihamah.com/banners/sample.webp"
              error={form.formState.errors.imageUrl?.message}
              autoFocus
              {...form.register("imageUrl")}
            />

            {/* Quick Demo Presets */}
            <div style={{ marginTop: "8px", marginBottom: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "block", marginBottom: "4px" }}>
                أو اختر صورة جاهزة للتجربة:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {PRESET_BANNER_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="button secondary"
                    style={{ fontSize: "11px", padding: "4px 8px", height: "auto" }}
                    onClick={() => {
                      form.setValue("imageUrl", preset.url, { shouldDirty: true, shouldValidate: true });
                      if (!form.getValues("title")) {
                        form.setValue("title", preset.label, { shouldDirty: true });
                      }
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <TextField
              label="عنوان إداري للبنر (اختياري)"
              placeholder="مثال: موسم عسل السدر الصيفي"
              error={form.formState.errors.title?.message}
              {...form.register("title")}
            />

            <div className="form-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label className="form-field">
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "4px", display: "block" }}>
                  نوع التوجيه عند النقر
                </span>
                <select
                  className="select-control"
                  style={{ width: "100%" }}
                  {...form.register("targetType")}
                >
                  <option value="none">بدون توجيه</option>
                  <option value="category">فتح قسم محدد</option>
                  <option value="listing">فتح إعلان محدد</option>
                </select>
              </label>

              <TextField
                label="معرّف القسم أو رقم الإعلان"
                placeholder="مثال: 5"
                disabled={watchTargetType === "none"}
                error={form.formState.errors.targetId?.message}
                {...form.register("targetId", {
                  setValueAs: (v) =>
                    v === "" || v === undefined || v === null ? null : Number(v),
                })}
              />
            </div>

            <div className="form-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
              <label className="form-field">
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "4px", display: "block" }}>
                  تاريخ بدء الظهور
                </span>
                <input
                  type="date"
                  className="select-control"
                  style={{ width: "100%" }}
                  {...form.register("startsAt")}
                />
              </label>

              <label className="form-field">
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "4px", display: "block" }}>
                  تاريخ انتهاء الظهور
                </span>
                <input
                  type="date"
                  className="select-control"
                  style={{ width: "100%" }}
                  {...form.register("endsAt")}
                />
                {form.formState.errors.endsAt && (
                  <span style={{ color: "var(--color-danger)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    {form.formState.errors.endsAt.message}
                  </span>
                )}
              </label>
            </div>

            <div className="form-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
              <TextField
                type="number"
                label="ترتيب الظهور"
                placeholder="0"
                error={form.formState.errors.sortOrder?.message}
                {...form.register("sortOrder", { valueAsNumber: true })}
              />

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    {...form.register("isActive")}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  تفعيل ظهور البنر فورياً
                </label>
              </div>
            </div>

            <div
              className="modal-actions"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <button
                className="button secondary"
                type="button"
                onClick={requestClose}
                disabled={isPending}
              >
                إلغاء
              </button>
              <SubmitButton pending={isPending}>
                حفظ البنر
              </SubmitButton>
            </div>
          </ValidatedForm>
        )}
      </FormDialog>

      {/* Delete High-Risk ConfirmDialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        intent="danger"
        title="حذف البنر الترويجي"
        entityName={deleteTarget?.title || (deleteTarget ? `بنر #${deleteTarget.id}` : undefined)}
        description="هل أنت متأكد من رغبتك في حذف هذا البنر الترويجي نهائياً؟"
        consequence="سيتم إزالة البنر فورياً من التطبيق ولن يتم عرضه للمستخدمين في الصفحة الرئيسية."
        confirmLabel="حذف البنر"
        cancelLabel="إلغاء"
        submitting={isPending}
        resource="banners"
        action="delete"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
