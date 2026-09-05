import { Beef, CarFront, ChevronDown, ChevronUp, Home, Pencil, Plus, Smartphone, Upload, Wheat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { initialCategories, type CategoryRecord } from "../../../data/adminFixtures";

const icons: Record<string, LucideIcon> = { car: CarFront, livestock: Beef, property: Home, electronics: Smartphone, agriculture: Wheat };

export function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories);
  const [editor, setEditor] = useState<CategoryRecord | "new" | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("car");
  const [toast, setToast] = useState("");

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
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

  return (
    <>
      <PageHeader title="إدارة الأقسام" description="تعديل الأقسام التي تظهر في التطبيق والتحكم بأيقوناتها وترتيبها وحالتها." action={<AuthorizedButton resource="categories" action="create" className="button" type="button" onClick={() => openEditor("new")}><Plus size={17} />إضافة قسم</AuthorizedButton>} />
      <section className="card data-surface">
        <div className="table-toolbar"><div><h2>الأقسام الرئيسية</h2><p className="panel-copy">التغيير في الترتيب أو الحالة ينعكس مباشرة على الشاشة الرئيسية للموبايل.</p></div><span className="record-count">{categories.length} أقسام</span></div>
        <div className="table-wrap"><table><thead><tr><th>الترتيب</th><th>القسم</th><th>عدد الإعلانات</th><th>الحالة</th><th>إعادة الترتيب</th><th>الإجراء</th></tr></thead><tbody>
          {categories.map((category, index) => { const Icon = icons[category.icon] ?? Home; return <tr key={category.id}><td className="numeric">{category.sortOrder}</td><td><div className="category-cell"><span><Icon size={20} /></span><strong>{category.name}</strong></div></td><td className="numeric">{category.listings.toLocaleString("ar-SA")}</td><td><AuthorizedButton resource="categories" action="edit" className={`switch ${category.isActive ? "on" : ""}`} type="button" role="switch" aria-checked={category.isActive} onClick={() => toggle(category.id)}><i /></AuthorizedButton><StatusBadge value={category.isActive ? "enabled" : "disabled"} /></td><td><div className="row-actions"><AuthorizedButton resource="categories" action="edit" className="icon-button table-action" disabled={index === 0} type="button" onClick={() => move(index, -1)} aria-label="تحريك للأعلى"><ChevronUp size={16} /></AuthorizedButton><AuthorizedButton resource="categories" action="edit" className="icon-button table-action" disabled={index === categories.length - 1} type="button" onClick={() => move(index, 1)} aria-label="تحريك للأسفل"><ChevronDown size={16} /></AuthorizedButton></div></td><td><AuthorizedButton resource="categories" action="edit" className="icon-button table-action" type="button" onClick={() => openEditor(category)} aria-label="تعديل القسم"><Pencil size={16} /></AuthorizedButton></td></tr>; })}
        </tbody></table></div>
      </section>
      <Modal open={Boolean(editor)} title={editor === "new" ? "إضافة قسم جديد" : "تعديل القسم"} onClose={() => setEditor(null)}><label className="form-field"><span>اسم القسم بالعربية</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: مستلزمات منزلية" /></label><fieldset className="icon-picker"><legend>أيقونة القسم</legend><div>{Object.entries(icons).map(([key, Icon]) => <button className={icon === key ? "active" : ""} type="button" key={key} onClick={() => setIcon(key)}><Icon size={22} /></button>)}</div></fieldset><label className="upload-field"><Upload size={18} /><span><strong>رفع أيقونة مخصصة</strong><small>PNG أو SVG، بحد أقصى 500 كيلوبايت</small></span><input type="file" accept="image/png,image/svg+xml" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setEditor(null)}>إلغاء</button><AuthorizedButton resource="categories" action={editor === "new" ? "create" : "edit"} className="button" type="button" disabled={!name.trim()} onClick={save}>حفظ القسم</AuthorizedButton></div></Modal>
      <Toast message={toast} />
    </>
  );
}
