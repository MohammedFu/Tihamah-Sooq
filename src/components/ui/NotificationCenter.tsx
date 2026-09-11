import {
  Bell,
  CheckCheck,
  CircleDollarSign,
  Flag,
  MessageSquareText,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

export interface OperationalAlert {
  id: string;
  type: "action" | "warning" | "system";
  title: string;
  description: string;
  time: string;
  path: string;
  read: boolean;
  icon: LucideIcon;
}

export function NotificationCenter({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "action" | "system">("all");
  const panelRef = useRef<HTMLDivElement>(null);

  const [alerts, setAlerts] = useState<OperationalAlert[]>([
    {
      id: "alert-listings",
      type: "action",
      title: locale === "ar" ? "إعلانات بانتظار المراجعة (12)" : "12 Listings Pending Review",
      description: locale === "ar" ? "تتطلب قرار قبول أو رفض من قبل المشرفين." : "Require moderation decision from review team.",
      time: locale === "ar" ? "منذ 10 دقائق" : "10m ago",
      path: "/listings?status=pending_review",
      read: false,
      icon: ShieldCheck,
    },
    {
      id: "alert-commissions",
      type: "action",
      title: locale === "ar" ? "إشعارات عمولات مسددة (8)" : "8 Paid Commission Receipts",
      description: locale === "ar" ? "إشعارات بنكية بانتظار تدقيق الإيداع واعتماد 1%." : "Bank receipts awaiting deposit audit & 1% verification.",
      time: locale === "ar" ? "منذ 25 دقيقة" : "25m ago",
      path: "/commissions?status=paid",
      read: false,
      icon: CircleDollarSign,
    },
    {
      id: "alert-reports",
      type: "warning",
      title: locale === "ar" ? "بلاغات احتيال مفتوحة (6)" : "6 Open Fraud & Abuse Reports",
      description: locale === "ar" ? "بلاغات مستعجلة من المشترين عن إعلانات مخالفة." : "Urgent buyer reports regarding policy violations.",
      time: locale === "ar" ? "منذ ساعة" : "1h ago",
      path: "/reports?status=open",
      read: false,
      icon: Flag,
    },
    {
      id: "alert-otp",
      type: "system",
      title: locale === "ar" ? "تنبيه استهلاك رسائل OTP" : "OTP SMS Quota Alert",
      description: locale === "ar" ? "تم استهلاك 6,840 من أصل 10,000 رسالة (68%)." : "6,840 of 10,000 quota used (68%).",
      time: locale === "ar" ? "اليوم" : "Today",
      path: "/system",
      read: true,
      icon: MessageSquareText,
    },
  ]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const handleAlertClick = (alert: OperationalAlert) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, read: true } : a))
    );
    navigate(alert.path);
    onClose();
  };

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter((item) => {
    if (tab === "action") return item.type === "action" || item.type === "warning";
    if (tab === "system") return item.type === "system";
    return true;
  });

  return (
    <div
      ref={panelRef}
      className="notif-dropdown card"
      role="region"
      aria-label={t.common.notifications}
    >
      <div className="notif-header">
        <div className="notif-title-row">
          <div className="notif-title-group">
            <Bell size={18} aria-hidden="true" />
            <span className="notif-heading">{t.common.notifications}</span>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button
                className="notif-text-btn"
                type="button"
                onClick={markAllRead}
                aria-label={locale === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
              >
                <CheckCheck size={14} aria-hidden="true" />
                <span>{locale === "ar" ? "قراءة الكل" : "Mark all read"}</span>
              </button>
            )}
            <button
              className="icon-button notif-close-btn"
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="notif-tabs" role="tablist">
          <button
            className={`notif-tab ${tab === "all" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "all"}
            type="button"
            onClick={() => setTab("all")}
          >
            {t.common.all}
          </button>
          <button
            className={`notif-tab ${tab === "action" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "action"}
            type="button"
            onClick={() => setTab("action")}
          >
            {locale === "ar" ? "مهام مطلوبة" : "Action Required"}
          </button>
          <button
            className={`notif-tab ${tab === "system" ? "active" : ""}`}
            role="tab"
            aria-selected={tab === "system"}
            type="button"
            onClick={() => setTab("system")}
          >
            {t.nav.system}
          </button>
        </div>
      </div>

      <div className="notif-list" role="feed">
        {filteredAlerts.length === 0 ? (
          <div className="notif-empty" role="status">
            {t.common.empty}
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <article
                key={alert.id}
                className={`notif-item ${alert.read ? "read" : "unread"}`}
                onClick={() => handleAlertClick(alert)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleAlertClick(alert);
                  }
                }}
              >
                <div className={`notif-icon-box ${alert.type}`}>
                  <Icon size={17} aria-hidden="true" />
                </div>
                <div className="notif-content">
                  <div className="notif-row">
                    <strong className="notif-item-title">{alert.title}</strong>
                    <time className="notif-time">{alert.time}</time>
                  </div>
                  <p className="notif-desc">{alert.description}</p>
                </div>
                {!alert.read && <span className="notif-dot" aria-hidden="true" />}
              </article>
            );
          })
        )}
      </div>

      <div className="notif-footer">
        <button
          className="notif-view-all"
          type="button"
          onClick={() => {
            navigate("/system");
            onClose();
          }}
        >
          {locale === "ar" ? "عرض سجل التدقيق والإشعارات الكامل" : "View Full Audit & System Logs"}
        </button>
      </div>
    </div>
  );
}
