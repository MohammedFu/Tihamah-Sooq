import { ChevronDown, ChevronLeft, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { initialRegions } from "../../../data/adminFixtures";

type Editor = { type: "region" | "village"; regionId?: number; id?: number; name?: string };

export function LocationsPage() {
  const [regions, setRegions] = useState(initialRegions);
  const [expanded, setExpanded] = useState<number[]>(regions.map((region) => region.id));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [name, setName] = useState("");
  const [toast, setToast] = useState("");

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function openEditor(next: Editor) { setEditor(next); setName(next.name ?? ""); }
  function save() {
    if (!editor || !name.trim()) return;
    if (editor.type === "region") {
      setRegions((items) => editor.id ? items.map((item) => item.id === editor.id ? { ...item, name } : item) : [...items, { id: Date.now(), name, isActive: true, villages: [] }]);
    } else if (editor.regionId) {
      setRegions((items) => items.map((region) => region.id === editor.regionId ? { ...region, villages: editor.id ? region.villages.map((village) => village.id === editor.id ? { ...village, name } : village) : [...region.villages, { id: Date.now(), name, isActive: true, activeListings: 0 }] } : region));
    }
    notify(editor.id ? "تم حفظ التعديلات وتحديث شجرة المواقع" : "تمت الإضافة إلى شجرة المواقع"); setEditor(null); setName("");
  }

  function deleteVillage(regionId: number, villageId: number, activeListings: number) {
    if (activeListings > 0) { notify(`لا يمكن الحذف: توجد ${activeListings} إعلانات نشطة مرتبطة بالقرية`); return; }
    setRegions((items) => items.map((region) => region.id === regionId ? { ...region, villages: region.villages.filter((village) => village.id !== villageId) } : region)); notify("تم حذف القرية حذفاً لطيفاً");
  }

  return (
    <>
      <PageHeader title="المناطق والقرى" description="إدارة الهيكل الجغرافي الذي يغذي التسجيل وفلاتر تطبيق الموبايل." action={<AuthorizedButton resource="regions" action="create" className="button" type="button" onClick={() => openEditor({ type: "region" })}><Plus size={17} />إضافة منطقة</AuthorizedButton>} />
      <div className="location-layout">
        <section className="card tree-panel">
          <div className="panel-title"><div><h2>شجرة المواقع</h2><p className="panel-copy">{regions.length} مناطق · {regions.reduce((total, region) => total + region.villages.length, 0)} قرى</p></div></div>
          <div className="tree-list">{regions.map((region) => {
            const isExpanded = expanded.includes(region.id);
            return <article className="tree-region" key={region.id}><div className="tree-region-row"><button className="tree-toggle" type="button" onClick={() => setExpanded((ids) => ids.includes(region.id) ? ids.filter((id) => id !== region.id) : [...ids, region.id])}>{isExpanded ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}<MapPin size={18} /><span><strong>{region.name}</strong><small>{region.villages.length} قرى</small></span></button><div className="row-actions"><StatusBadge value={region.isActive ? "enabled" : "disabled"} /><AuthorizedButton resource="regions" action="edit" className="icon-button table-action" type="button" onClick={() => openEditor({ type: "region", id: region.id, name: region.name })} aria-label="تعديل المنطقة"><Pencil size={15} /></AuthorizedButton><AuthorizedButton resource="villages" action="create" className="icon-button table-action" type="button" onClick={() => openEditor({ type: "village", regionId: region.id })} aria-label="إضافة قرية"><Plus size={16} /></AuthorizedButton></div></div>
              {isExpanded && <div className="village-list">{region.villages.map((village, index) => <div className="village-row" key={village.id}><span className="order-index">{index + 1}</span><span className="village-name"><strong>{village.name}</strong><small>{village.activeListings} إعلان نشط</small></span><StatusBadge value={village.isActive ? "enabled" : "disabled"} /><div className="row-actions"><AuthorizedButton resource="villages" action="edit" className="icon-button table-action" type="button" onClick={() => openEditor({ type: "village", regionId: region.id, id: village.id, name: village.name })} aria-label="تعديل القرية"><Pencil size={15} /></AuthorizedButton><AuthorizedButton resource="villages" action="delete" className="icon-button table-action danger-icon" type="button" onClick={() => deleteVillage(region.id, village.id, village.activeListings)} aria-label="حذف القرية"><Trash2 size={15} /></AuthorizedButton></div></div>)}</div>}
            </article>;
          })}</div>
        </section>
        <aside className="card panel integrity-panel"><h2>سلامة البيانات</h2><p className="panel-copy">حذف القرى يتم بصورة آمنة ولا يسمح به عند وجود إعلانات نشطة مرتبطة.</p><div className="integrity-stat"><strong>{regions.reduce((total, region) => total + region.villages.reduce((sum, village) => sum + village.activeListings, 0), 0)}</strong><span>إعلان مرتبط بالمواقع الحالية</span></div><div className="api-note"><small>نقطة الربط</small><code>GET /api/v1/admin/regions</code><code>GET /api/v1/admin/villages</code></div></aside>
      </div>
      <Modal open={Boolean(editor)} title={editor?.id ? `تعديل ${editor.type === "region" ? "المنطقة" : "القرية"}` : `إضافة ${editor?.type === "region" ? "منطقة" : "قرية"}`} onClose={() => setEditor(null)}><label className="form-field"><span>الاسم بالعربية</span><input value={name} onChange={(event) => setName(event.target.value)} autoFocus placeholder={editor?.type === "region" ? "مثال: جازان - تهامة" : "مثال: قرية المضايا"} /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setEditor(null)}>إلغاء</button>{editor && <AuthorizedButton resource={editor.type === "region" ? "regions" : "villages"} action={editor.id ? "edit" : "create"} className="button" type="button" disabled={!name.trim()} onClick={save}>حفظ</AuthorizedButton>}</div></Modal>
      <Toast message={toast} />
    </>
  );
}
