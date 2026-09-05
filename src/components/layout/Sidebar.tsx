import { usePermissions } from "@refinedev/core";
import { NavLink } from "react-router-dom";
import { canAccessWithPermissions } from "../../providers/accessControlProvider";
import type { Permission } from "../../types/domain";
import { navigation } from "./navigation";

type SidebarProps = { open: boolean; onNavigate: () => void };

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const permissions = usePermissions<readonly Permission[]>({});
  const visibleNavigation = navigation.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.isSuccess && canAccessWithPermissions(permissions.data, item.resource, "list")),
  })).filter((group) => group.items.length > 0);
  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="التنقل الرئيسي">
      <NavLink className="brand" to="/" onClick={onNavigate}>
        <span className="brand-mark">ت</span>
        <span>سوق <span className="brand-accent">تهامة</span></span>
      </NavLink>
      <nav>
        {visibleNavigation.map((group) => (
          <div key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map(({ label, path, icon: Icon, badge }) => (
              <NavLink key={path} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to={path} end={path === "/"} onClick={onNavigate}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
                {badge ? <span className="nav-badge">{badge}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
