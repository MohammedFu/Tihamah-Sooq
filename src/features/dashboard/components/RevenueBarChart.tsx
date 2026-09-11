import { useState } from "react";
import { useI18n } from "../../../i18n/I18nContext";

export interface RevenuePeriod {
  period: string;
  periodEn: string;
  paid: number;
  verified: number;
  pending: number;
}

const DEFAULT_REVENUE_DATA: RevenuePeriod[] = [
  { period: "الأسبوع 1", periodEn: "W1", paid: 1200, verified: 1100, pending: 400 },
  { period: "الأسبوع 2", periodEn: "W2", paid: 1850, verified: 1600, pending: 650 },
  { period: "الأسبوع 3", periodEn: "W3", paid: 2400, verified: 2150, pending: 500 },
  { period: "الأسبوع 4", periodEn: "W4", paid: 2950, verified: 2800, pending: 720 },
];

export function RevenueBarChart({ data = DEFAULT_REVENUE_DATA }: { data?: RevenuePeriod[] }) {
  const { locale, t, formatMoney } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 25, bottom: 35, left: 35 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.paid, d.verified, d.pending]), 3500);

  const slotWidth = chartWidth / data.length;
  const barWidth = 18;
  const barGap = 4;

  const getBarHeight = (val: number) => (val / maxVal) * chartHeight;

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <section className="card panel chart-panel" aria-labelledby="revenue-chart-heading">
      <div className="panel-head">
        <div>
          <h2 id="revenue-chart-heading">{t.dashboard.revenueTitle}</h2>
          <p className="panel-copy">
            {locale === "ar"
              ? "مقارنة قيم العمولات المسددة والمعتمدة مقابل المتبقية."
              : "Comparison of paid and verified commissions versus pending amounts."}
          </p>
        </div>
        <div className="chart-legend">
          <span className="legend-item">
            <i className="legend-dot paid" aria-hidden="true" />
            <small>{t.dashboard.paidAwaitingAudit}</small>
          </span>
          <span className="legend-item">
            <i className="legend-dot verified" aria-hidden="true" />
            <small>{t.dashboard.paidAndVerified}</small>
          </span>
          <span className="legend-item">
            <i className="legend-dot pending" aria-hidden="true" />
            <small>{locale === "ar" ? "عمولات متبقية" : "Pending Commissions"}</small>
          </span>
        </div>
      </div>

      <div className="chart-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="growth-svg"
          role="img"
          aria-label={t.dashboard.revenueTitle}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + chartHeight * pct;
            return (
              <line
                key={pct}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}

          {/* Bars */}
          {data.map((d, index) => {
            const slotCenterX = padding.left + index * slotWidth + slotWidth / 2;
            const totalGroupWidth = barWidth * 3 + barGap * 2;
            const startX = slotCenterX - totalGroupWidth / 2;

            const isHovered = index === hoveredIndex;

            const paidH = getBarHeight(d.paid);
            const verH = getBarHeight(d.verified);
            const penH = getBarHeight(d.pending);

            const bottomY = padding.top + chartHeight;

            return (
              <g key={d.periodEn}>
                {/* Background highlight on hover */}
                {isHovered && (
                  <rect
                    x={padding.left + index * slotWidth + 4}
                    y={padding.top}
                    width={slotWidth - 8}
                    height={chartHeight}
                    fill="var(--color-surface-subtle)"
                    rx="4"
                  />
                )}

                {/* Paid Bar */}
                <rect
                  x={startX}
                  y={bottomY - paidH}
                  width={barWidth}
                  height={paidH}
                  fill="var(--color-warning)"
                  rx="3"
                />

                {/* Verified Bar */}
                <rect
                  x={startX + barWidth + barGap}
                  y={bottomY - verH}
                  width={barWidth}
                  height={verH}
                  fill="var(--color-success)"
                  rx="3"
                />

                {/* Pending Bar */}
                <rect
                  x={startX + (barWidth + barGap) * 2}
                  y={bottomY - penH}
                  width={barWidth}
                  height={penH}
                  fill="var(--color-danger)"
                  rx="3"
                />

                {/* X axis labels */}
                <text
                  x={slotCenterX}
                  y={height - 10}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize="11"
                  fontWeight="600"
                >
                  {locale === "ar" ? d.period : d.periodEn}
                </text>

                {/* Transparent hover column */}
                <rect
                  x={padding.left + index * slotWidth}
                  y={padding.top}
                  width={slotWidth}
                  height={chartHeight + padding.bottom}
                  fill="transparent"
                  cursor="pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="chart-tooltip card"
            role="status"
            style={{
              insetInlineStart: `${padding.left + hoveredIndex! * slotWidth + 10}px`,
            }}
          >
            <strong>{locale === "ar" ? hoveredPoint.period : hoveredPoint.periodEn}</strong>
            <div className="tooltip-row">
              <span className="legend-dot paid" />
              <span>{t.dashboard.paidAwaitingAudit}:</span>
              <b>{formatMoney(hoveredPoint.paid)}</b>
            </div>
            <div className="tooltip-row">
              <span className="legend-dot verified" />
              <span>{t.dashboard.paidAndVerified}:</span>
              <b>{formatMoney(hoveredPoint.verified)}</b>
            </div>
            <div className="tooltip-row">
              <span className="legend-dot pending" />
              <span>{t.dashboard.dueCommissions}:</span>
              <b>{formatMoney(hoveredPoint.pending)}</b>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
