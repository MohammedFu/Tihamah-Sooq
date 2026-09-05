import { Bell, Menu, Search } from "lucide-react";
import { AdminMenu } from "../../features/auth/components/AdminMenu";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
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
        <AdminMenu />
      </div>
    </header>
  );
}
