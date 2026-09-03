import { NavLink } from "react-router-dom";
import { navigation } from "./navigation";

type SidebarProps = { open: boolean; onNavigate: () => void };

export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="التنقل الرئيسي">
      <NavLink className="brand" to="/" onClick={onNavigate}>
        <span className="brand-mark">ت</span>
        <span>سوق <span className="brand-accent">تهامة</span></span>
      </NavLink>
      <nav>
        {navigation.map((group) => (
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
