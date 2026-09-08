import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import {
  DataTable,
  useDataTableUrlState,
  type DataTableColumn,
} from "../../../components/ui/DataTable";
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
import type { Category } from "../../../types/domain";
import { useCategories } from "../api/useCategories";
import {
  categorySchema,
  PRESET_ICONS,
  type CategoryFormValues,
} from "../schemas/categorySchema";

function formatErrorMessage(
  error: unknown,
  action: "create" | "update" | "delete" | "reorder",
): string {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.statusCode === 409) {
      if (action === "delete") {
        return "لا يمكن حذف هذا القسم لوجود إعلانات مرتبطة به. يرجى نقل أو حذف الإعلانات المرتبطة أولاً، أو تعطيل القسم بدلاً من حذفه.";
      }
      return "اسم القسم مسجل مسبقاً. يرجى اختيار اسم مختلف للقسم.";
    }
    if (error.status === 422 || error.statusCode === 422) {
      return "البيانات المدخلة غير صالحة. يرجى التأكد من صحة الحقول.";
    }
    return error.userMessage;
  }
  if (error instanceof Error) return error.message;
  return "تعذر إكمال العملية، يرجى المحاولة مرة أخرى.";
}

function renderCategoryIcon(category: Category) {
  if (category.iconUrl && (category.iconUrl.startsWith("http://") || category.iconUrl.startsWith("https://"))) {
    return (
      <img
        src={category.iconUrl}
        alt=""
        style={{ width: "20px", height: "20px", objectFit: "contain" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  const matchingPreset = PRESET_ICONS.find(
    (preset) =>
      preset.defaultUrl === category.iconUrl ||
      category.name.includes(preset.label.split(" ")[0]),
  );

  const IconComponent = matchingPreset?.icon ?? Layers;
  return <IconComponent aria-hidden="true" size={20} />;
}

type EditorMode = "create" | "edit";

export function CategoriesPage() {
  const {
    categoriesList,
    isPending,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
    reorderCategories,
  } = useCategories();

  const notification = useAdminNotification();
  const rawCategories = categoriesList.result.data ?? [];
  const loading = categoriesList.query.isPending;
  const error = categoriesList.query.isError ? categoriesList.query.error : null;

  const [search, setSearch] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const table = useDataTableUrlState({
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      iconUrl: "",
      sortOrder: 1,
      isActive: true,
    },
  });

  const currentIconUrl = form.watch("iconUrl");

  // Sorted list of categories by sortOrder, then name
  const sortedCategories = useMemo(() => {
    return [...rawCategories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ar"));
  }, [rawCategories]);

  // Filtered categories by search
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedCategories;
    return sortedCategories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [sortedCategories, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / table.pageSize));
  const page = Math.min(table.page, totalPages);
  const rows = filteredCategories.slice((page - 1) * table.pageSize, page * table.pageSize);

  useEffect(() => {
    if (table.page > totalPages) table.setPage(totalPages);
  }, [table.page, totalPages]);

  function openCreateCategory() {
    setActionError(null);
    form.reset({
      name: "",
      iconUrl: "",
      sortOrder: sortedCategories.length + 1,
      isActive: true,
    });
    setEditingCategory(null);
    setEditorMode("create");
  }

  function openEditCategory(category: Category) {
    setActionError(null);
    form.reset({
      name: category.name,
      iconUrl: category.iconUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setEditingCategory(category);
    setEditorMode("edit");
  }

  function closeEditor() {
    if (isPending) return;
    setEditorMode(null);
    setEditingCategory(null);
    setActionError(null);
    form.reset();
  }

  function closeDeleteModal() {
    if (isPending) return;
    setDeleteTarget(null);
    setActionError(null);
  }

  async function handleSave(values: CategoryFormValues) {
    setActionError(null);
    try {
      if (editorMode === "create") {
        await createCategory({
          name: values.name,
          iconUrl: values.iconUrl ?? "",
          sortOrder: values.sortOrder ?? sortedCategories.length + 1,
          isActive: values.isActive ?? true,
        });
        notification.success(`تمت إضافة القسم «${values.name}» بنجاح وتحديث الكاش.`);
      } else if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: values.name,
          iconUrl: values.iconUrl ?? "",
          sortOrder: values.sortOrder ?? editingCategory.sortOrder,
          isActive: values.isActive ?? true,
        });
        notification.success(`تم تحديث بيانات قسم «${values.name}» بنجاح.`);
      }
      closeEditor();
    } catch (err) {
      setActionError(formatErrorMessage(err, editorMode === "create" ? "create" : "update"));
    }
  }

  async function handleToggle(category: Category) {
    try {
      await toggleCategoryActive(category);
      notification.success(
        category.isActive
          ? `تم تعطيل قسم «${category.name}».`
          : `تم تفعيل قسم «${category.name}».`,
      );
    } catch (err) {
      notification.error(formatErrorMessage(err, "update"));
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sortedCategories.length) return;

    const currentItem = sortedCategories[index];
    const targetItem = sortedCategories[target];

    // Ensure distinctly separated sort orders
    let newCurrentOrder = targetItem.sortOrder;
    let newTargetOrder = currentItem.sortOrder;
    if (newCurrentOrder === newTargetOrder) {
      newCurrentOrder = target + 1;
      newTargetOrder = index + 1;
    }

    try {
      await reorderCategories(currentItem, newCurrentOrder, targetItem, newTargetOrder);
      notification.success("تم تحديث ترتيب ظهور الأقسام.");
    } catch (err) {
      notification.error(formatErrorMessage(err, "reorder"));
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteCategory(deleteTarget.id);
      notification.success(`تم حذف قسم «${deleteTarget.name}» بنجاح.`);
      closeDeleteModal();
    } catch (err) {
      setActionError(formatErrorMessage(err, "delete"));
    }
  }

  const columns: DataTableColumn<Category>[] = useMemo(() => {
    return [
      {
        id: "sortOrder",
        header: "الترتيب",
        className: "numeric",
        cell: (category) => category.sortOrder.toLocaleString("ar-SA"),
      },
      {
        id: "category",
        header: "القسم",
        cell: (category) => (
          <div className="category-cell">
            <span>{renderCategoryIcon(category)}</span>
            <strong>{category.name}</strong>
          </div>
        ),
      },
      {
        id: "status",
        header: "الحالة",
        cell: (category) => (
          <>
            <AuthorizedButton
              resource="categories"
              action="edit"
              className={`switch ${category.isActive ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={category.isActive}
              aria-label={`تغيير حالة قسم ${category.name}`}
              title={category.isActive ? `تعطيل قسم ${category.name}` : `تفعيل قسم ${category.name}`}
              disabled={isPending}
              onClick={() => void handleToggle(category)}
            >
              <i />
            </AuthorizedButton>
            <StatusBadge value={category.isActive ? "enabled" : "disabled"} />
          </>
        ),
      },
      {
        id: "reorder",
        header: "إعادة الترتيب",
        cell: (category) => {
          const index = sortedCategories.findIndex((item) => item.id === category.id);
          return (
            <div className="row-actions">
              <AuthorizedButton
                resource="categories"
                action="edit"
                className="icon-button table-action"
                disabled={isPending || index === 0}
                type="button"
                onClick={() => void handleMove(index, -1)}
                aria-label={`تحريك ${category.name} للأعلى`}
                title={`تحريك ${category.name} للأعلى`}
              >
                <ChevronUp size={16} />
              </AuthorizedButton>
              <AuthorizedButton
                resource="categories"
                action="edit"
                className="icon-button table-action"
                disabled={isPending || index === sortedCategories.length - 1}
                type="button"
                onClick={() => void handleMove(index, 1)}
                aria-label={`تحريك ${category.name} للأسفل`}
                title={`تحريك ${category.name} للأسفل`}
              >
                <ChevronDown size={16} />
              </AuthorizedButton>
            </div>
          );
        },
      },
      {
        id: "action",
        header: "الإجراءات",
        cell: (category) => (
          <div className="row-actions">
            <AuthorizedButton
              resource="categories"
              action="edit"
              className="icon-button table-action"
              type="button"
              disabled={isPending}
              onClick={() => openEditCategory(category)}
              aria-label={`تعديل قسم ${category.name}`}
              title={`تعديل قسم ${category.name}`}
            >
              <Pencil size={16} />
            </AuthorizedButton>
            <AuthorizedButton
              resource="categories"
              action="delete"
              className="icon-button table-action danger-icon"
              type="button"
              disabled={isPending}
              onClick={() => setDeleteTarget(category)}
              aria-label={`حذف قسم ${category.name}`}
              title={`حذف قسم ${category.name}`}
            >
              <Trash2 size={16} />
            </AuthorizedButton>
          </div>
        ),
      },
    ];
  }, [sortedCategories, isPending]);

  return (
    <>
      <PageHeader
        title="إدارة الأقسام"
        description="تعديل الأقسام التي تظهر في التطبيق والتحكم بأيقوناتها وترتيبها وحالتها."
        action={
          <AuthorizedButton
            resource="categories"
            action="create"
            className="button"
            type="button"
            onClick={openCreateCategory}
          >
            <Plus size={17} />
            إضافة قسم
          </AuthorizedButton>
        }
      />

      <section className="card data-surface">
        <div className="table-toolbar" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2>الأقسام الرئيسية</h2>
            <p className="panel-copy">
              التغيير في الترتيب أو الحالة ينعكس مباشرة على الشاشة الرئيسية للموبايل.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="search-field" style={{ minWidth: "220px" }}>
              <Search aria-hidden="true" size={16} />
              <input
                type="search"
                placeholder="بحث باسم القسم…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="تصفية قائمة الأقسام"
              />
            </div>
            <span className="record-count">
              {filteredCategories.length === rawCategories.length
                ? `${rawCategories.length} أقسام`
                : `${filteredCategories.length} من أصل ${rawCategories.length}`}
            </span>
          </div>
        </div>

        {loading && (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            جارٍ تحميل قائمة الأقسام…
          </div>
        )}

        {error && (
          <div className="alert-box danger" role="alert" style={{ margin: "24px" }}>
            <Info aria-hidden="true" size={20} />
            <div>
              <strong>تعذر تحميل الأقسام</strong>
              <p>{error instanceof ApiError ? error.userMessage : "حدث خطأ أثناء تحميل البيانات."}</p>
            </div>
            <button
              className="button secondary small"
              type="button"
              onClick={() => void categoriesList.query.refetch()}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !error && (
          <DataTable
            caption="قائمة الأقسام الرئيسية"
            columns={columns}
            rows={rows}
            rowKey={(category) => category.id}
            emptyMessage={search ? "لا توجد أقسام تطابق بحثك." : "لا توجد أقسام مسجلة."}
            pagination={{
              page,
              pageSize: table.pageSize,
              total: filteredCategories.length,
              pageSizeOptions: table.pageSizeOptions,
            }}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
          />
        )}
      </section>

      {/* Create / Edit Form Dialog */}
      <FormDialog
        open={Boolean(editorMode)}
        title={editorMode === "create" ? "إضافة قسم جديد" : "تعديل بيانات القسم"}
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
              <div className="alert-box danger" role="alert" style={{ marginBottom: "16px" }}>
                <Info aria-hidden="true" size={18} />
                <p>{actionError}</p>
              </div>
            )}

            <TextField
              label="اسم القسم بالعربية"
              placeholder="مثال: مستلزمات منزلية"
              error={form.formState.errors.name?.message}
              autoFocus
              {...form.register("name")}
            />

            <fieldset className="icon-picker" style={{ marginTop: "12px" }}>
              <legend>أيقونة سريعة من مكتبة النظام</legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {PRESET_ICONS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = currentIconUrl === preset.defaultUrl;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={isSelected ? "active" : ""}
                      aria-label={`اختيار أيقونة ${preset.label}`}
                      aria-pressed={isSelected}
                      onClick={() => form.setValue("iconUrl", preset.defaultUrl, { shouldValidate: true })}
                      title={preset.label}
                    >
                      <Icon aria-hidden="true" size={20} />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <TextField
              label="رابط الأيقونة (اختياري)"
              placeholder="https://cdn.tihamah.com/icons/sample.svg"
              error={form.formState.errors.iconUrl?.message}
              style={{ marginTop: "12px" }}
              {...form.register("iconUrl")}
            />

            <TextField
              label="ترتيب الظهور"
              type="number"
              min={0}
              placeholder="1"
              error={form.formState.errors.sortOrder?.message}
              style={{ marginTop: "12px" }}
              {...form.register("sortOrder", { valueAsNumber: true })}
            />

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                margin: "12px 0 16px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              <input type="checkbox" {...form.register("isActive")} />
              <span>تفعيل القسم وظهوره في تطبيق الموبايل</span>
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
                {editorMode === "edit" ? "حفظ التعديلات" : "إضافة القسم"}
              </SubmitButton>
            </div>
          </ValidatedForm>
        )}
      </FormDialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف القسم"
        intent="danger"
        icon={<Trash2 aria-hidden="true" size={22} />}
        description={
          <>
            <p>
              هل أنت متأكد من رغبتك في حذف قسم «<strong>{deleteTarget?.name}</strong>»؟
            </p>
            <p className="block-copy text-muted" style={{ marginTop: "8px" }}>
              تحذير: لا يمكن التراجع عن هذا الإجراء. ستفشل عملية الحذف إذا كانت هناك إعلانات
              نشطة أو سابقة مرتبطة بهذا القسم في قاعدة البيانات.
            </p>
          </>
        }
        error={actionError}
        confirmLabel="تأكيد الحذف"
        pendingLabel="جارٍ الحذف…"
        submitting={isPending}
        resource="categories"
        action="delete"
        onConfirm={() => void handleDeleteConfirm()}
        onClose={closeDeleteModal}
      />
    </>
  );
}
