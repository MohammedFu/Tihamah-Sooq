import { usePermissions } from "@refinedev/core";
import { X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { canAccessWithPermissions } from "../../providers/accessControlProvider";
import type { Permission } from "../../types/domain";
import { useI18n } from "../../i18n/I18nContext";
import { navigation } from "./navigation";

type SidebarProps = { open: boolean; onNavigate: () => void };

const groupKeyMap: Record<string, "overview" | "operations" | "content" | "system"> = {
  "نظرة عامة": "overview",
  "العمليات والرقابة": "operations",
  "المحتوى والهيكلة": "content",
  "النظام": "system",
};

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { locale, t } = useI18n();
  const permissions = usePermissions<readonly Permission[]>({});
  const visibleNavigation = navigation.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.isSuccess && canAccessWithPermissions(permissions.data, item.resource, "list")),
  })).filter((group) => group.items.length > 0);

  const getGroupLabel = (defaultLabel: string) => {
    const key = groupKeyMap[defaultLabel];
    return key && t.nav[key] ? t.nav[key] : defaultLabel;
  };

  const getItemLabel = (resource: string, defaultLabel: string) => {
    const navKey = resource === "system" ? "systemLogs" : (resource as keyof typeof t.nav);
    return t.nav[navKey] || defaultLabel;
  };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label={t.nav.mainNavigation} role={open ? "dialog" : undefined} aria-modal={open || undefined}>
      <div className="sidebar-heading">
        <NavLink className="brand" to="/" onClick={onNavigate}>
          <span className="brand-mark">{locale === "ar" ? "ت" : "T"}</span>
          <span>{t.common.brandPrefix} <span className="brand-accent">{t.common.brandSuffix}</span></span>
        </NavLink>
        <button className="icon-button sidebar-close" data-sidebar-close type="button" onClick={onNavigate} aria-label={t.common.closeMenu}><X aria-hidden="true" size={18} /></button>
      </div>
      <nav>
        {visibleNavigation.map((group) => (
          <div key={group.label}>
            <p className="nav-label">{getGroupLabel(group.label)}</p>
            {group.items.map(({ label, path, resource, icon: Icon, badge }) => (
              <NavLink key={path} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to={path} end={path === "/"} onClick={onNavigate}>
                <Icon aria-hidden="true" />
                <span>{getItemLabel(resource, label)}</span>
                {badge ? <span className="nav-badge">{badge}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
