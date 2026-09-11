import { Bell, Menu, Search } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import { AdminMenu } from "../../features/auth/components/AdminMenu";
import { CommandPalette } from "../ui/CommandPalette";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { NotificationCenter } from "../ui/NotificationCenter";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useI18n } from "../../i18n/I18nContext";

export const Header = forwardRef<HTMLButtonElement, { onMenuClick: () => void }>(function Header({ onMenuClick }, menuButtonRef) {
  const { t } = useI18n();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="topbar-start">
          <button className="icon-button menu-button" ref={menuButtonRef} type="button" onClick={onMenuClick} aria-label={t.common.openMenu}><Menu aria-hidden="true" size={19} /></button>
          <button
            className="command-trigger"
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={t.common.commandPalette}
          >
            <Search size={17} aria-hidden="true" />
            <span className="search-placeholder">{t.common.searchPlaceholder}</span>
            <kbd className="search-shortcut">⌘K</kbd>
          </button>
        </div>
        <div className="topbar-end">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="notif-wrapper">
            <button
              className="icon-button notification-button"
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label={t.common.notifications}
              aria-expanded={notifOpen}
            >
              <Bell aria-hidden="true" size={18} />
              <span />
            </button>
            <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>
          <AdminMenu />
        </div>
      </header>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
});
