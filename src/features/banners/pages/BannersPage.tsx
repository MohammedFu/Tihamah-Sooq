import { CalendarDays, ChevronDown, ChevronUp, ImagePlus, Link2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { initialBanners, type BannerRecord } from "../../../data/adminFixtures";

const targetLabels = { category: "قسم", listing: "إعلان", none: "بدون رابط" };

export function BannersPage() {
  const [banners, setBanners] = useState(initialBanners);
  const [editor, setEditor] = useState<BannerRecord | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [targetType, setTargetType] = useState<BannerRecord["targetType"]>("none");
  const [target, setTarget] = useState("");
  const [toast, setToast] = useState("");
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function openEditor(banner: BannerRecord | "new") { setEditor(banner); setTitle(banner === "new" ? "" : banner.title); setTargetType(banner === "new" ? "none" : banner.targetType); setTarget(banner === "new" ? "" : banner.target); }
  function save() {
    if (!title.trim() || !editor) return;
    const fallbackImage = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80";
    setBanners((items) => editor === "new" ? [...items, { id: Date.now(), title, image: fallbackImage, targetType, target: target || "بدون رابط", startAt: "اليوم", endAt: "بعد 30 يوماً", sortOrder: items.length + 1, isActive: true }] : items.map((item) => item.id === editor.id ? { ...item, title, targetType, target: target || "بدون رابط" } : item));
    setEditor(null); notify("تم حفظ البنر وتحديث موضعه في التطبيق");
  }
  function move(index: number, direction: -1 | 1) { const targetIndex = index + direction; if (targetIndex < 0 || targetIndex >= banners.length) return; setBanners((items) => { const next = [...items]; [next[index], next[targetIndex]] = [next[targetIndex], next[index]]; return next.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex + 1 })); }); notify("تم تحديث ترتيب البنرات"); }
  function toggle(id: number) { setBanners((items) => items.map((item) => item.id === id ? { ...item, isActive: !item.isActive } : item)); notify("تم تحديث حالة البنر"); }
  function remove(id: number) { if (!window.confirm("حذف هذا البنر؟")) return; setBanners((items) => items.filter((item) => item.id !== id)); notify("تم حذف البنر"); }

  return (
    <>
      <PageHeader title="البنرات الترويجية" description="إدارة صور الصفحة الرئيسية وروابطها وفترات ظهورها في تطبيق الموبايل." action={<button className="button" type="button" onClick={() => openEditor("new")}><Plus size={17} />إضافة بنر</button>} />
      <div className="banner-summary"><span><ImagePlus size={18} /><strong>{banners.filter((item) => item.isActive).length}</strong> بنرات مفعلة</span><span><CalendarDays size={18} /><strong>2</strong> مجدولة هذا الشهر</span></div>
      <section className="banner-grid">{banners.map((banner, index) => <article className="card banner-card" key={banner.id}>
        <div className="banner-image"><img src={banner.image} alt={banner.title} /><span>ترتيب {banner.sortOrder}</span></div>
        <div className="banner-content"><div className="detail-title-row"><div><h2>{banner.title}</h2><p className="panel-copy">بنر #{banner.id}</p></div><StatusBadge value={banner.isActive ? "enabled" : "disabled"} /></div><div className="banner-meta"><span><Link2 size={15} />{targetLabels[banner.targetType]}: {banner.target}</span><span><CalendarDays size={15} />{banner.startAt} - {banner.endAt}</span></div><div className="banner-actions"><button className="icon-button" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="تحريك للأعلى"><ChevronUp size={17} /></button><button className="icon-button" type="button" disabled={index === banners.length - 1} onClick={() => move(index, 1)} aria-label="تحريك للأسفل"><ChevronDown size={17} /></button><button className={`switch ${banner.isActive ? "on" : ""}`} type="button" onClick={() => toggle(banner.id)} aria-label="تغيير الحالة"><i /></button><span className="spacer" /><button className="icon-button" type="button" onClick={() => openEditor(banner)} aria-label="تعديل"><Pencil size={16} /></button><button className="icon-button danger-icon" type="button" onClick={() => remove(banner.id)} aria-label="حذف"><Trash2 size={16} /></button></div></div>
      </article>)}</section>
      <Modal open={Boolean(editor)} title={editor === "new" ? "إضافة بنر جديد" : "تعديل البنر"} onClose={() => setEditor(null)}><label className="form-field"><span>عنوان إداري للبنر</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: موسم عسل السدر" /></label><label className="upload-field"><Upload size={18} /><span><strong>رفع صورة البنر</strong><small>نسبة مقترحة 16:6 للشاشات الصغيرة</small></span><input type="file" accept="image/*" /></label><div className="form-columns"><label className="form-field"><span>نوع التوجيه</span><select value={targetType} onChange={(event) => setTargetType(event.target.value as BannerRecord["targetType"])}><option value="none">بدون رابط</option><option value="category">فتح قسم</option><option value="listing">فتح إعلان</option></select></label><label className="form-field"><span>القسم أو رقم الإعلان</span><input value={target} onChange={(event) => setTarget(event.target.value)} disabled={targetType === "none"} /></label></div><div className="form-columns"><label className="form-field"><span>تاريخ البدء</span><input type="date" /></label><label className="form-field"><span>تاريخ الانتهاء</span><input type="date" /></label></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setEditor(null)}>إلغاء</button><button className="button" type="button" disabled={!title.trim()} onClick={save}>حفظ البنر</button></div></Modal>
      <Toast message={toast} />
    </>
  );
}
