import { Ban, Eye, Search, ShieldCheck, Smartphone, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, useDataTableUrlState, type DataTableColumn } from "../../../components/ui/DataTable";
import { Drawer } from "../../../components/ui/Drawer";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AuthorizedButton } from "../../../components/ui/AuthorizedButton";
import { initialUsers, type UserRecord } from "../../../data/adminFixtures";
import { useAdminNotification } from "../../../providers/notificationStore";

function userColumns(onSelect: (user: UserRecord) => void): DataTableColumn<UserRecord>[] {
  return [
    { id: "user", header: "المستخدم", cell: (user) => <div className="user-cell"><span>{user.name.slice(0, 1)}</span><div><strong>{user.name}</strong><small dir="ltr">{user.phone}</small></div></div> },
    { id: "location", header: "الموقع", cell: (user) => <>{user.village}<small className="block-copy">{user.region}</small></> },
    { id: "joinedAt", header: "تاريخ التسجيل", cell: (user) => user.joinedAt },
    { id: "listings", header: "الإعلانات", className: "numeric", cell: (user) => user.listings.toLocaleString("ar-SA") },
    { id: "paidCommission", header: "العمولات المسددة", className: "numeric", cell: (user) => <>{user.paidCommission.toLocaleString("ar-SA")} ر.س</> },
    { id: "status", header: "حالة الحساب", cell: (user) => <StatusBadge value={user.isBanned ? "banned" : "active"} /> },
    { id: "action", header: "الإجراء", cell: (user) => <AuthorizedButton resource="users" action="show" className="icon-button table-action" type="button" onClick={() => onSelect(user)} aria-label="عرض المستخدم" title="عرض المستخدم"><Eye size={17} /></AuthorizedButton> },
  ];
}

export function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const table = useDataTableUrlState<"status">({ filters: [{ name: "status", defaultValue: "all", values: ["all", "active", "banned"] }], defaultPageSize: 10, pageSizeOptions: [10, 20, 50] });
  const filter = table.filters.status as "all" | "active" | "banned";
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [banTarget, setBanTarget] = useState<UserRecord | null>(null);
  const [banReason, setBanReason] = useState("");
  const notification = useAdminNotification();

  const visible = useMemo(() => users.filter((user) => {
    const stateMatch = filter === "all" || (filter === "banned" ? user.isBanned : !user.isBanned);
    return stateMatch && `${user.name} ${user.phone} ${user.village}`.toLowerCase().includes(table.search.toLowerCase());
  }), [filter, table.search, users]);
  const totalPages = Math.max(1, Math.ceil(visible.length / table.pageSize));
  const page = Math.min(table.page, totalPages);
  const rows = visible.slice((page - 1) * table.pageSize, page * table.pageSize);
  const columns = useMemo(() => userColumns(setSelected), []);
  useEffect(() => { if (table.page > totalPages) table.setPage(totalPages); }, [table.page, totalPages]);

  function updateUser(id: number, isBanned: boolean, reason?: string) {
    setUsers((items) => items.map((item) => item.id === id ? { ...item, isBanned, banReason: reason } : item));
    setSelected((item) => item?.id === id ? { ...item, isBanned, banReason: reason } : item);
    notification.success(isBanned ? "تم حظر الحساب وإنهاء الجلسات النشطة" : "تم إلغاء حظر الحساب");
  }

  function confirmBan() {
    if (!banTarget || !banReason.trim()) return;
    updateUser(banTarget.id, true, banReason); setBanTarget(null); setBanReason("");
  }

  return (
    <>
      <PageHeader title="إدارة المستخدمين" description="البحث في حسابات العملاء، مراجعة نشاطهم، وإدارة الحظر وإبطال الجلسات." />
      <div className="summary-strip"><span><strong>{users.length.toLocaleString("ar-SA")}</strong> حساب مسجل</span><span><strong>{users.filter((user) => !user.isBanned).length}</strong> نشط</span><span><strong>{users.filter((user) => user.isBanned).length}</strong> محظور</span></div>
      <section className="card data-surface">
        <DataTable caption="قائمة حسابات المستخدمين" columns={columns} rows={rows} rowKey={(user) => user.id} emptyMessage="لا توجد حسابات مطابقة للفلاتر الحالية." pagination={{ page, pageSize: table.pageSize, total: visible.length, pageSizeOptions: table.pageSizeOptions }} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} toolbar={<div className="filters-row"><label className="field-with-icon"><Search size={16} /><input value={table.search} onChange={(event) => table.setSearch(event.target.value)} placeholder="بحث بالاسم أو رقم الجوال" aria-label="البحث في المستخدمين" /></label><select className="select-control" value={filter} onChange={(event) => table.setFilter("status", event.target.value)} aria-label="تصفية حالة الحساب"><option value="all">كل الحسابات</option><option value="active">الحسابات النشطة</option><option value="banned">الحسابات المحظورة</option></select></div>} />
      </section>

      <Drawer open={Boolean(selected)} title={selected?.name ?? ""} onClose={() => setSelected(null)}>{selected && <div className="detail-stack">
        <div className="profile-hero"><span>{selected.name.slice(0, 1)}</span><div><h3>{selected.name}</h3><p dir="ltr">{selected.phone}</p></div><StatusBadge value={selected.isBanned ? "banned" : "active"} /></div>
        {selected.banReason && <div className="alert-box danger"><Ban size={18} /><div><strong>سبب الحظر</strong><p>{selected.banReason}</p></div></div>}
        <dl className="detail-grid"><div><dt>المنطقة</dt><dd>{selected.region}</dd></div><div><dt>القرية</dt><dd>{selected.village}</dd></div><div><dt>تاريخ التسجيل</dt><dd>{selected.joinedAt}</dd></div><div><dt>عدد الإعلانات</dt><dd>{selected.listings}</dd></div><div><dt>العمولات المسددة</dt><dd>{selected.paidCommission.toLocaleString("ar-SA")} ر.س</dd></div><div><dt>الأجهزة النشطة</dt><dd>2</dd></div></dl>
        <div className="activity-list"><h3>آخر نشاطات الحساب</h3><div><Smartphone size={17} /><span><strong>آخر تسجيل دخول</strong><small>اليوم، 08:35 · Android</small></span></div><div><ShieldCheck size={17} /><span><strong>آخر إعلان</strong><small>منذ 18 دقيقة · قيد المراجعة</small></span></div></div>
        <div className="decision-actions">{selected.isBanned ? <AuthorizedButton resource="users" action="ban" className="button success-button" type="button" onClick={() => updateUser(selected.id, false)}><Unlock size={17} />إلغاء الحظر</AuthorizedButton> : <AuthorizedButton resource="users" action="ban" className="button danger-button" type="button" onClick={() => setBanTarget(selected)}><Ban size={17} />حظر المستخدم</AuthorizedButton>}</div>
      </div>}</Drawer>
      <Modal open={Boolean(banTarget)} title="حظر حساب المستخدم" onClose={() => setBanTarget(null)}><div className="alert-box danger"><Ban size={18} /><p>سيتم إنهاء جميع جلسات المستخدم وإبطال رموز الدخول فورياً.</p></div><label className="form-field"><span>سبب الحظر</span><textarea rows={4} value={banReason} onChange={(event) => setBanReason(event.target.value)} placeholder="اكتب سبباً واضحاً ليُحفظ في سجل التدقيق" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setBanTarget(null)}>إلغاء</button><AuthorizedButton resource="users" action="ban" className="button danger-button" type="button" disabled={!banReason.trim()} onClick={confirmBan}>تأكيد الحظر</AuthorizedButton></div></Modal>
    </>
  );
}
