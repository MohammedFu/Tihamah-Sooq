import { useLogout } from "@refinedev/core";
import { Bell, LoaderCircle, LogOut, Menu, Search } from "lucide-react";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const logout = useLogout();

  return (
    <header className="topbar">
      <div className="topbar-start">
        <button className="icon-button menu-button" type="button" onClick={onMenuClick} aria-label="فتح القائمة"><Menu size={19} /></button>
        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <input className="search" type="search" placeholder="ابحث في لوحة التحكم" />
        </label>
      </div>
      <div className="topbar-end">
        <button className="icon-button notification-button" type="button" aria-label="الإشعارات"><Bell size={18} /><span /></button>
        <button className="icon-button" type="button" title="تسجيل الخروج" aria-label="تسجيل الخروج" disabled={logout.isPending} onClick={() => logout.mutate()}>
          {logout.isPending ? <LoaderCircle className="auth-spinner" aria-hidden="true" size={18} /> : <LogOut aria-hidden="true" size={18} />}
        </button>
        <div className="admin-copy"><strong>محمد الأحمدي</strong><small>مدير النظام</small></div>
        <div className="avatar" aria-label="حساب مدير النظام">م أ</div>
      </div>
    </header>
  );
}
