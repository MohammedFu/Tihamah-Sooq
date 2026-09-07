import { usePermissions } from "@refinedev/core";
import { BadgeCheck, CircleDollarSign, Flag, MessageSquareText, PackageCheck, RefreshCw, ShoppingBag, Users } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../../../components/ui/ErrorState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { canAccessWithPermissions } from "../../../providers/accessControlProvider";
import type { DashboardMetrics, Permission } from "../../../types/domain";
import { useDashboardMetrics } from "../api/useDashboardMetrics";

const numberFormatter = new Intl.NumberFormat("ar-SA");
const currencyFormatter = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 2,
});
const dateTimeFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDashboardNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatDashboardMoney(value: number) {
  return currencyFormatter.format(value);
}

export function isDashboardEmpty(metrics: DashboardMetrics) {
  return metrics.totalUsers === 0
    && metrics.activeListings === 0
    && metrics.soldListings === 0
    && metrics.pendingReviewListings === 0
    && metrics.totalCommissions === 0
    && metrics.pendingCommissions === 0
    && metrics.paidCommissions === 0
    && metrics.openReports === 0;
}

export function OverviewPage() {
  const { query } = useDashboardMetrics();
  const metrics = query.data?.data;
  const updatedAt = query.dataUpdatedAt;
  const hasData = Boolean(metrics);

  return (
    <>
      <PageHeader
        title="لوحة المؤشرات"
        description="نظرة تشغيلية محدثة على صحة المنصة وطوابير المراجعة والتحصيل."
        action={(
          <div className="dashboard-refresh">
            <FreshnessStatus fetching={query.isFetching} stale={hasData && query.isStale} updatedAt={updatedAt} />
            <button
              className="button secondary"
              type="button"
              disabled={query.isFetching}
              aria-busy={query.isFetching}
              onClick={() => { void query.refetch(); }}
            >
              <RefreshCw className={query.isFetching ? "auth-spinner" : undefined} aria-hidden="true" size={16} />
              {query.isFetching ? "جارٍ التحديث…" : "تحديث المؤشرات"}
            </button>
          </div>
        )}
      />

      {!hasData && query.isPending && <DashboardSkeleton />}
      {!hasData && query.isError && <ErrorState error={query.error} onRetry={() => { void query.refetch(); }} retrying={query.isFetching} />}
      {metrics && <DashboardContent metrics={metrics} refreshError={query.isError ? query.error : null} />}
    </>
  );
}

function FreshnessStatus({ fetching, stale, updatedAt }: { fetching: boolean; stale: boolean; updatedAt: number }) {
  let label = "لم تُحمّل المؤشرات بعد";
  if (updatedAt) {
    const formatted = dateTimeFormatter.format(updatedAt);
    label = stale ? `البيانات قديمة — آخر تحديث ${formatted}` : `آخر تحديث ${formatted}`;
    if (fetching) label = `جارٍ التحديث — آخر بيانات ${formatted}`;
  } else if (fetching) {
    label = "جارٍ تحميل المؤشرات";
  }

  return (
    <span className={`live-pill${stale ? " stale" : ""}`} role="status" aria-live="polite">
      <i aria-hidden="true" />
      {updatedAt ? <time dateTime={new Date(updatedAt).toISOString()}>{label}</time> : label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" role="status" aria-live="polite" aria-label="جارٍ تحميل مؤشرات المنصة">
      <span className="sr-only">جارٍ تحميل مؤشرات المنصة</span>
      <section className="metric-grid metric-grid-six" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <div className="card metric metric-skeleton" key={index}><span /><strong /><small /></div>)}
      </section>
      <div className="overview-grid" aria-hidden="true">
        <div className="card panel panel-skeleton" />
        <div className="card panel panel-skeleton" />
      </div>
    </div>
  );
}

function DashboardContent({ metrics, refreshError }: { metrics: DashboardMetrics; refreshError: unknown }) {
  const cards = [
    {
      label: "إجمالي المستخدمين",
      value: formatDashboardNumber(metrics.totalUsers),
      detail: `الجدد اليوم: ${optionalNumber(metrics.newUsersToday)} · هذا الأسبوع: ${optionalNumber(metrics.newUsersThisWeek)}`,
      icon: Users,
      tone: "blue",
    },
    {
      label: "الإعلانات النشطة",
      value: formatDashboardNumber(metrics.activeListings),
      detail: `الإعلانات الجديدة اليوم: ${optionalNumber(metrics.newListingsToday)}`,
      icon: ShoppingBag,
      tone: "teal",
    },
    {
      label: "الإعلانات المباعة",
      value: formatDashboardNumber(metrics.soldListings),
      detail: "إجمالي الإعلانات المسجلة كمباعة",
      icon: PackageCheck,
      tone: "green",
    },
    {
      label: "بانتظار مراجعة الإعلان",
      value: formatDashboardNumber(metrics.pendingReviewListings),
      detail: "تتطلب قراراً من فريق المراجعة",
      icon: BadgeCheck,
      tone: "amber",
    },
    {
      label: "العمولات المستحقة",
      value: formatDashboardMoney(metrics.pendingCommissions),
      detail: "قيمة العمولات غير المسددة",
      icon: CircleDollarSign,
      tone: "amber",
    },
    {
      label: "البلاغات المفتوحة",
      value: formatDashboardNumber(metrics.openReports),
      detail: "بلاغات تحتاج إلى المعالجة",
      icon: Flag,
      tone: "red",
    },
  ];

  return (
    <div aria-busy="false">
      {Boolean(refreshError) && <div className="dashboard-warning" role="alert">تعذر تحديث المؤشرات. ما زالت آخر بيانات ناجحة معروضة ويمكنك إعادة المحاولة.</div>}
      {isDashboardEmpty(metrics) && <div className="dashboard-empty" role="status">لا توجد أنشطة مسجلة في مؤشرات المنصة حالياً.</div>}

      <section className="metric-grid metric-grid-six" aria-label="مؤشرات المنصة">
        {cards.map(({ label, value, detail, icon: Icon, tone }) => (
          <article className="card metric" key={label}>
            <div className="metric-top"><span className={`metric-icon ${tone}`}><Icon aria-hidden="true" size={19} /></span><span className="metric-change">{detail}</span></div>
            <p className="metric-value">{value}</p><p className="metric-label">{label}</p>
          </article>
        ))}
      </section>

      <div className="overview-grid">
        <section className="card panel" aria-labelledby="commission-summary-title">
          <div className="panel-head"><div><h2 id="commission-summary-title">ملخص العمولات</h2><p className="panel-copy">القيم الإجمالية حسب الحالات التي يؤكدها عقد الخادم.</p></div><CircleDollarSign aria-hidden="true" size={22} /></div>
          <dl className="dashboard-financials">
            <div><dt>إجمالي العمولات</dt><dd>{formatDashboardMoney(metrics.totalCommissions)}</dd></div>
            <div><dt>مسددة وبانتظار التدقيق</dt><dd>{formatDashboardMoney(metrics.paidCommissions)}</dd></div>
            <div><dt>مسددة ومعتمدة</dt><dd>{optionalMoney(metrics.verifiedCommissions)}</dd></div>
          </dl>
          {metrics.verifiedCommissions === null && <p className="contract-note">قيمة العمولات المعتمدة غير متاحة في استجابة الخادم الحالية.</p>}
        </section>
        <OtpPanel used={metrics.otpMessagesUsed} quota={metrics.otpMessagesQuota} />
      </div>

      <section className="card panel dashboard-queues" aria-labelledby="work-queues-title">
        <h2 id="work-queues-title">طوابير العمل</h2><p className="panel-copy">انتقل مباشرة إلى السجلات المصفاة بالحالة المطابقة للمؤشر.</p>
        <div className="queue">
          <QueueItem label="إعلانات بانتظار المراجعة" value={formatDashboardNumber(metrics.pendingReviewListings)} tone="red" path="/listings?status=pending_review" resource="listings" />
          <QueueItem label="قيمة عمولات بانتظار التدقيق" value={formatDashboardMoney(metrics.paidCommissions)} tone="amber" path="/commissions?status=paid" resource="commissions" />
          <QueueItem label="بلاغات مفتوحة" value={formatDashboardNumber(metrics.openReports)} tone="blue" path="/reports?status=open" resource="reports" />
        </div>
      </section>
    </div>
  );
}

function OtpPanel({ used, quota }: { used: number | null; quota: number | null }) {
  if (used === null || quota === null) {
    return (
      <section className="card panel dashboard-unavailable" aria-labelledby="otp-title">
        <MessageSquareText aria-hidden="true" size={28} />
        <div><h2 id="otp-title">استهلاك رسائل OTP</h2><p>غير متاح في استجابة الخادم الحالية.</p></div>
      </section>
    );
  }

  const percentage = quota === 0 ? 0 : Math.min(100, (used / quota) * 100);
  const remaining = Math.max(0, quota - used);
  const ringStyle = { background: `conic-gradient(var(--color-violet) ${percentage}%, var(--color-surface-muted) 0)` } as CSSProperties;
  return (
    <section className="card panel" aria-labelledby="otp-title">
      <div className="panel-head"><div><h2 id="otp-title">استهلاك رسائل OTP</h2><p className="panel-copy">الاستهلاك من الحصة المتاحة.</p></div><strong>{numberFormatter.format(percentage)}%</strong></div>
      <div className="otp-ring dashboard-otp-ring" style={ringStyle}><div><strong>{formatDashboardNumber(used)}</strong><span>رسالة مستخدمة</span></div></div>
      <div className="progress-track" role="progressbar" aria-label="نسبة استهلاك رسائل OTP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{ width: `${percentage}%` }} /></div>
      <div className="stat-split dashboard-otp-stats"><span><small>المتبقي</small><strong>{formatDashboardNumber(remaining)}</strong></span><span><small>الحصة</small><strong>{formatDashboardNumber(quota)}</strong></span></div>
    </section>
  );
}

function optionalNumber(value: number | null) {
  return value === null ? "غير متاح" : formatDashboardNumber(value);
}

function optionalMoney(value: number | null) {
  return value === null ? "غير متاح" : formatDashboardMoney(value);
}

function QueueItem({ label, value, tone, path, resource }: { label: string; value: string; tone: string; path: string; resource: string }) {
  return <PermissionLink className="queue-link" to={path} resource={resource}><span><i className={`dot ${tone}`} aria-hidden="true" />{label}</span><strong>{value}</strong></PermissionLink>;
}

function PermissionLink({ resource, to, className, children }: { resource: string; to: string; className: string; children: ReactNode }) {
  const permissions = usePermissions<readonly Permission[]>({});
  if (!permissions.isSuccess || !canAccessWithPermissions(permissions.data, resource, "list")) return null;
  return <Link className={className} to={to}>{children}</Link>;
}
