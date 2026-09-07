import { Beef, CarFront, ChevronDown, ChevronUp, Home, Pencil, Plus, Smartphone, Upload, Wheat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { initialCategories, type CategoryRecord } from "../../../data/adminFixtures";
import { useAdminNotification } from "../../../providers/notificationStore";

const icons: Record<string, LucideIcon> = { car: CarFront, livestock: Beef, property: Home, electronics: Smartphone, agriculture: Wheat };
const iconLabels: Record<string, string> = { car: "سيارة", livestock: "مواشٍ", property: "عقار", electronics: "إلكترونيات", agriculture: "زراعة" };

function categoryColumns(categories: readonly CategoryRecord[], onEdit: (category: CategoryRecord) => void, onMove: (index: number, direction: -1 | 1) => void, onToggle: (id: number) => void): DataTableColumn<CategoryRecord>[] {
  return [
    { id: "sortOrder", header: "الترتيب", className: "numeric", cell: (category) => category.sortOrder.toLocaleString("ar-SA") },
    { id: "category", header: "القسم", cell: (category) => { const Icon = icons[category.icon] ?? Home; return <div className="category-cell"><span><Icon size={20} /></span><strong>{category.name}</strong></div>; } },
    { id: "listings", header: "عدد الإعلانات", className: "numeric", cell: (category) => category.listings.toLocaleString("ar-SA") },
    { id: "status", header: "الحالة", cell: (category) => <><AuthorizedButton resource="categories" action="edit" className={`switch ${category.isActive ? "on" : ""}`} type="button" role="switch" aria-checked={category.isActive} aria-label={`تغيير حالة قسم ${category.name}`} title={`تغيير حالة قسم ${category.name}`} onClick={() => onToggle(category.id)}><i /></AuthorizedButton><StatusBadge value={category.isActive ? "enabled" : "disabled"} /></> },
    { id: "reorder", header: "إعادة الترتيب", cell: (category) => { const index = categories.findIndex((item) => item.id === category.id); return <div className="row-actions"><AuthorizedButton resource="categories" action="edit" className="icon-button table-action" disabled={index === 0} type="button" onClick={() => onMove(index, -1)} aria-label={`تحريك ${category.name} للأعلى`} title={`تحريك ${category.name} للأعلى`}><ChevronUp size={16} /></AuthorizedButton><AuthorizedButton resource="categories" action="edit" className="icon-button table-action" disabled={index === categories.length - 1} type="button" onClick={() => onMove(index, 1)} aria-label={`تحريك ${category.name} للأسفل`} title={`تحريك ${category.name} للأسفل`}><ChevronDown size={16} /></AuthorizedButton></div>; } },
    { id: "action", header: "الإجراء", cell: (category) => <AuthorizedButton resource="categories" action="edit" className="icon-button table-action" type="button" onClick={() => onEdit(category)} aria-label={`تعديل قسم ${category.name}`} title={`تعديل قسم ${category.name}`}><Pencil size={16} /></AuthorizedButton> },
  ];
}

export function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories);
  const [editor, setEditor] = useState<CategoryRecord | "new" | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("car");
  const notification = useAdminNotification();
  const table = useDataTableUrlState({ defaultPageSize: 10, pageSizeOptions: [10, 20, 50] });

  function notify(message: string) { notification.success(message); }
  function openEditor(category: CategoryRecord | "new") { setEditor(category); setName(category === "new" ? "" : category.name); setIcon(category === "new" ? "car" : category.icon); }
  function save() {
    if (!name.trim() || !editor) return;
    setCategories((items) => editor === "new" ? [...items, { id: Date.now(), name, icon, sortOrder: items.length + 1, listings: 0, isActive: true }] : items.map((item) => item.id === editor.id ? { ...item, name, icon } : item));
    setEditor(null); notify("تم حفظ القسم وتحديث كاش تطبيق الموبايل");
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= categories.length) return;
    setCategories((items) => { const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex + 1 })); });
    notify("تم تحديث ترتيب ظهور الأقسام");
  }
  function toggle(id: number) { setCategories((items) => items.map((item) => item.id === id ? { ...item, isActive: !item.isActive } : item)); notify("تم تحديث حالة القسم"); }
  const totalPages = Math.max(1, Math.ceil(categories.length / table.pageSize));
  const page = Math.min(table.page, totalPages);
  const rows = categories.slice((page - 1) * table.pageSize, page * table.pageSize);
  const columns = useMemo(() => categoryColumns(categories, openEditor, move, toggle), [categories]);
  useEffect(() => { if (table.page > totalPages) table.setPage(totalPages); }, [table.page, totalPages]);

  return (
    <>
      <PageHeader title="إدارة الأقسام" description="تعديل الأقسام التي تظهر في التطبيق والتحكم بأيقوناتها وترتيبها وحالتها." action={<AuthorizedButton resource="categories" action="create" className="button" type="button" onClick={() => openEditor("new")}><Plus size={17} />إضافة قسم</AuthorizedButton>} />
      <section className="card data-surface">
        <DataTable caption="قائمة الأقسام الرئيسية" columns={columns} rows={rows} rowKey={(category) => category.id} emptyMessage="لا توجد أقسام." pagination={{ page, pageSize: table.pageSize, total: categories.length, pageSizeOptions: table.pageSizeOptions }} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} toolbar={<div className="table-toolbar"><div><h2>الأقسام الرئيسية</h2><p className="panel-copy">التغيير في الترتيب أو الحالة ينعكس مباشرة على الشاشة الرئيسية للموبايل.</p></div><span className="record-count">{categories.length} أقسام</span></div>} />
      </section>
      <Modal open={Boolean(editor)} title={editor === "new" ? "إضافة قسم جديد" : "تعديل القسم"} onClose={() => setEditor(null)}><label className="form-field"><span>اسم القسم بالعربية</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: مستلزمات منزلية" /></label><fieldset className="icon-picker"><legend>أيقونة القسم</legend><div>{Object.entries(icons).map(([key, Icon]) => <button className={icon === key ? "active" : ""} type="button" key={key} aria-label={`اختيار أيقونة ${iconLabels[key]}`} aria-pressed={icon === key} onClick={() => setIcon(key)}><Icon aria-hidden="true" size={22} /></button>)}</div></fieldset><label className="upload-field"><Upload aria-hidden="true" size={18} /><span><strong>رفع أيقونة مخصصة</strong><small>PNG أو SVG، بحد أقصى 500 كيلوبايت</small></span><input type="file" accept="image/png,image/svg+xml" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setEditor(null)}>إلغاء</button><AuthorizedButton resource="categories" action={editor === "new" ? "create" : "edit"} className="button" type="button" disabled={!name.trim()} onClick={save}>حفظ القسم</AuthorizedButton></div></Modal>
    </>
  );
}
