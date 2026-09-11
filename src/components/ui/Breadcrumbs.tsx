import { Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

export function Breadcrumbs() {
  const location = useLocation();
  const { locale, dir, t } = useI18n();

  // If on root dashboard overview, don't clutter the page with redundant crumbs
  if (location.pathname === "/" || location.pathname === "") {
    return null;
  }

  const segments = location.pathname.split("/").filter(Boolean);

  const routeLabelMap: Record<string, string> = {
    listings: t.nav.listings,
    users: t.nav.users,
    commissions: t.nav.commissions,
    reports: t.nav.reports,
    categories: t.nav.categories,
    locations: t.nav.locations,
    villages: t.nav.locations,
    banners: t.nav.banners,
    system: t.nav.system,
  };

  let accumulatedPath = "";
  const crumbs = segments.map((seg) => {
    accumulatedPath += `/${seg}`;
    const label = routeLabelMap[seg] || seg;
    return { path: accumulatedPath, label };
  });

  const separatorChar = dir === "rtl" ? "‹" : "›";

  return (
    <nav
      aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumbs"}
      className="breadcrumbs-nav"
    >
      <ol className="breadcrumbs-list">
        <li className="breadcrumb-item">
          <Link to="/" className="breadcrumb-link">
            <Home size={13} aria-hidden="true" />
            <span>{t.nav.overview}</span>
          </Link>
        </li>
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={crumb.path} className="breadcrumb-item">
              <span className="breadcrumb-separator" aria-hidden="true">
                {separatorChar}
              </span>
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.path} className="breadcrumb-link">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
