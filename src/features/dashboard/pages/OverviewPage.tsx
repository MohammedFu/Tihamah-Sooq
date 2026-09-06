import { usePermissions } from "@refinedev/core";
import { ArrowLeft, CircleDollarSign, Flag, MessageSquareText, PackageCheck, ShoppingBag, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "../../../components/ui/DataTable";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { canAccessWithPermissions } from "../../../providers/accessControlProvider";
import type { Permission } from "../../../types/domain";

const metrics = [
  { label: "إجمالي المستخدمين", value: "8,420", change: "+142 هذا الأسبوع", icon: Users, tone: "blue" },
  { label: "الإعلانات النشطة", value: "1,286", change: "+34 اليوم", icon: ShoppingBag, tone: "teal" },
  { label: "تم البيع", value: "312", change: "+18 هذا الأسبوع", icon: PackageCheck, tone: "green" },
  { label: "عمولات مستحقة", value: "42,860 ر.س", change: "1% من المبيعات", icon: CircleDollarSign, tone: "amber" },
  { label: "بلاغات مفتوحة", value: "6", change: "3 عالية الأولوية", icon: Flag, tone: "red" },
  { label: "رسائل OTP المتبقية", value: "3,160", change: "من أصل 10,000", icon: MessageSquareText, tone: "violet" },
];

const chart = [44, 52, 48, 66, 58, 74, 81, 69, 88, 78, 94, 86];
type ReviewItem = { id: number; type: string; record: string; owner: string; time: string; status: string };
const reviewItems: ReviewItem[] = [
  { id: 1048, type: "إعلان", record: "#1048 - مجموعة أغنام حري", owner: "فواز أبو عبدل", time: "منذ 18 دقيقة", status: "pending_review" },
  { id: 511, type: "عمولة", record: "#511 - لاندكروزر 2012", owner: "عبدالله الغامدي", time: "منذ 42 دقيقة", status: "paid" },
  { id: 801, type: "بلاغ", record: "#801 - اشتباه احتيال", owner: "محمود السلمي", time: "منذ 55 دقيقة", status: "open" },
];
const reviewColumns: DataTableColumn<ReviewItem>[] = [
  { id: "type", header: "النوع", cell: (item) => item.type },
  { id: "record", header: "السجل", cell: (item) => item.record },
  { id: "owner", header: "صاحب الطلب", cell: (item) => item.owner },
  { id: "time", header: "الوقت", cell: (item) => item.time },
  { id: "status", header: "الحالة", cell: (item) => <StatusBadge value={item.status} /> },
];

export function OverviewPage() {
  return (
    <>
      <PageHeader title="لوحة المؤشرات" description="نظرة تشغيلية محدثة على صحة المنصة وحركة المراجعة والتحصيل." action={<span className="live-pill"><i /> آخر تحديث منذ 3 دقائق</span>} />
      <section className="metric-grid metric-grid-six" aria-label="مؤشرات المنصة">
        {metrics.map(({ label, value, change, icon: Icon, tone }) => (
          <article className="card metric" key={label}>
            <div className="metric-top"><span className={`metric-icon ${tone}`}><Icon size={19} /></span><span className="metric-change">{change}</span></div>
            <p className="metric-value">{value}</p><p className="metric-label">{label}</p>
          </article>
        ))}
      </section>

      <div className="overview-grid">
        <section className="card panel">
          <div className="panel-head"><div><h2>نمو الإعلانات</h2><p className="panel-copy">الإعلانات المنشورة خلال آخر 12 أسبوعاً.</p></div><span className="trend">+18.6%</span></div>
          <div className="chart" aria-label="رسم نمو الإعلانات">{chart.map((height, index) => <div className="chart-col" key={index}><span className="chart-bar" style={{ height: `${height}%` }} /></div>)}</div>
          <div className="chart-labels"><span>يونيو</span><span>يوليو</span><span>أغسطس</span><span>سبتمبر</span></div>
        </section>
        <section className="card panel">
          <div className="panel-head"><div><h2>استهلاك رسائل OTP</h2><p className="panel-copy">الباقة الحالية: 10,000 رسالة.</p></div><strong>68.4%</strong></div>
          <div className="otp-ring"><div><strong>6,840</strong><span>رسالة مستخدمة</span></div></div>
          <div className="progress-track"><span style={{ width: "68.4%" }} /></div>
          <div className="stat-split"><span><small>المتبقي</small><strong>3,160</strong></span><span><small>اليوم</small><strong>186</strong></span><span><small>معدل النجاح</small><strong>96.8%</strong></span></div>
        </section>
      </div>

      <div className="overview-grid overview-bottom">
        <section className="card table-card" style={{ marginTop: 0 }}>
          <DataTable caption="آخر عناصر المراجعة الإدارية" columns={reviewColumns} rows={reviewItems} rowKey={(item) => `${item.type}-${item.id}`} toolbar={<div className="table-toolbar"><div><h2>آخر عناصر المراجعة</h2><p className="panel-copy">العمليات التي تحتاج قراراً إدارياً.</p></div><PermissionLink className="text-link" to="/listings" resource="listings">عرض الكل <ArrowLeft size={15} /></PermissionLink></div>} />
        </section>
        <section className="card panel">
          <h2>طوابير العمل</h2><p className="panel-copy">الأولوية حسب أثرها على المستخدمين.</p>
          <div className="queue">
            <QueueItem label="إعلانات بانتظار المراجعة" value="12" tone="red" path="/listings" resource="listings" />
            <QueueItem label="إيصالات بانتظار التدقيق" value="8" tone="amber" path="/commissions" resource="commissions" />
            <QueueItem label="بلاغات مفتوحة" value="6" tone="blue" path="/reports" resource="reports" />
          </div>
        </section>
      </div>
    </>
  );
}

function QueueItem({ label, value, tone, path, resource }: { label: string; value: string; tone: string; path: string; resource: string }) {
  return <PermissionLink className="queue-link" to={path} resource={resource}><span><i className={`dot ${tone}`} />{label}</span><strong>{value}</strong></PermissionLink>;
}

function PermissionLink({ resource, to, className, children }: { resource: string; to: string; className: string; children: ReactNode }) {
  const permissions = usePermissions<readonly Permission[]>({});
  if (!permissions.isSuccess || !canAccessWithPermissions(permissions.data, resource, "list")) return null;
  return <Link className={className} to={to}>{children}</Link>;
}
