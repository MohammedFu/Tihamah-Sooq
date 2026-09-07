import { Bell, Menu, Search } from "lucide-react";
import { forwardRef } from "react";
import { AdminMenu } from "../../features/auth/components/AdminMenu";

export const Header = forwardRef<HTMLButtonElement, { onMenuClick: () => void }>(function Header({ onMenuClick }, menuButtonRef) {
  return (
    <header className="topbar">
      <div className="topbar-start">
        <button className="icon-button menu-button" ref={menuButtonRef} type="button" onClick={onMenuClick} aria-label="فتح القائمة"><Menu aria-hidden="true" size={19} /></button>
        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <input className="search" type="search" placeholder="ابحث في لوحة التحكم" aria-label="البحث في لوحة التحكم" />
        </label>
      </div>
      <div className="topbar-end">
        <button className="icon-button notification-button" type="button" aria-label="الإشعارات"><Bell aria-hidden="true" size={18} /><span /></button>
        <AdminMenu />
      </div>
    </header>
  );
});
