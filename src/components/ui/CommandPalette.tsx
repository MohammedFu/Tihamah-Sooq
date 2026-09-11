import {
  BellRing,
  CircleDollarSign,
  CornerDownLeft,
  Flag,
  FolderTree,
  Images,
  LayoutDashboard,
  MapPinned,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

export interface PaletteItem {
  id: string;
  title: string;
  category: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const items: PaletteItem[] = [
    // Navigation items
    {
      id: "nav-dashboard",
      title: t.nav.dashboard,
      category: t.common.quickNavigation,
      path: "/",
      icon: LayoutDashboard,
    },
    {
      id: "nav-listings",
      title: t.nav.listings,
      category: t.common.quickNavigation,
      path: "/listings",
      icon: ShieldCheck,
      badge: "12",
    },
    {
      id: "nav-users",
      title: t.nav.users,
      category: t.common.quickNavigation,
      path: "/users",
      icon: Users,
    },
    {
      id: "nav-commissions",
      title: t.nav.commissions,
      category: t.common.quickNavigation,
      path: "/commissions",
      icon: CircleDollarSign,
      badge: "8",
    },
    {
      id: "nav-reports",
      title: t.nav.reports,
      category: t.common.quickNavigation,
      path: "/reports",
      icon: Flag,
      badge: "6",
    },
    {
      id: "nav-locations",
      title: t.nav.locations,
      category: t.common.quickNavigation,
      path: "/locations",
      icon: MapPinned,
    },
    {
      id: "nav-categories",
      title: t.nav.categories,
      category: t.common.quickNavigation,
      path: "/categories",
      icon: FolderTree,
    },
    {
      id: "nav-banners",
      title: t.nav.banners,
      category: t.common.quickNavigation,
      path: "/banners",
      icon: Images,
    },
    {
      id: "nav-system",
      title: t.nav.systemLogs,
      category: t.common.quickNavigation,
      path: "/system",
      icon: BellRing,
    },
    // Quick Actions
    {
      id: "act-pending-listings",
      title: t.dashboard.pendingReview,
      category: t.common.actions,
      path: "/listings?status=pending_review",
      icon: Sparkles,
      badge: "Review",
    },
    {
      id: "act-paid-commissions",
      title: t.dashboard.paidAwaitingAudit,
      category: t.common.actions,
      path: "/commissions?status=paid",
      icon: CircleDollarSign,
      badge: "Audit",
    },
    {
      id: "act-open-reports",
      title: t.dashboard.openReports,
      category: t.common.actions,
      path: "/reports?status=open",
      icon: Flag,
      badge: "Urgent",
    },
    {
      id: "act-add-category",
      title: locale === "ar" ? "إضافة قسم جديد" : "Add New Category",
      category: t.common.actions,
      path: "/categories",
      icon: PlusCircle,
    },
    {
      id: "act-add-banner",
      title: locale === "ar" ? "إضافة بنر ترويجي" : "Add New Banner",
      category: t.common.actions,
      path: "/banners",
      icon: PlusCircle,
    },
  ];

  const filteredItems = items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.path.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      const frame = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  const handleSelect = (item: PaletteItem) => {
    navigate(item.path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (filteredItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="palette-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="palette-dialog card"
        role="dialog"
        aria-modal="true"
        aria-label={t.common.commandPalette}
        onKeyDown={handleKeyDown}
      >
        <div className="palette-search-bar">
          <Search aria-hidden="true" size={20} className="palette-search-icon" />
          <input
            ref={inputRef}
            className="palette-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.searchPlaceholder}
            aria-label={t.common.search}
            role="combobox"
            aria-expanded={filteredItems.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
          <button
            className="icon-button palette-close-btn"
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="palette-results-container">
          {filteredItems.length === 0 ? (
            <div className="palette-empty" role="status">
              {t.common.empty}
            </div>
          ) : (
            <ul ref={listRef} id={listboxId} className="palette-list" role="listbox">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                const Icon = item.icon;
                return (
                  <li
                    key={item.id}
                    id={`palette-item-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`palette-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="palette-item-start">
                      <span className="palette-item-icon">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <div className="palette-item-text">
                        <span className="palette-item-title">{item.title}</span>
                        <span className="palette-item-cat">{item.category}</span>
                      </div>
                    </div>
                    <div className="palette-item-end">
                      {item.badge && <span className="palette-badge">{item.badge}</span>}
                      {isSelected && (
                        <span className="palette-enter-hint" aria-hidden="true">
                          <CornerDownLeft size={14} />
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="palette-footer">
          <div className="palette-shortcuts">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> {locale === "ar" ? "للتنقل" : "to navigate"}
            </span>
            <span>
              <kbd>↵</kbd> {locale === "ar" ? "للاختيار" : "to select"}
            </span>
            <span>
              <kbd>esc</kbd> {locale === "ar" ? "للإغلاق" : "to close"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
