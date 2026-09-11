import { useState } from "react";
import { useI18n } from "../../../i18n/I18nContext";

export interface GrowthPoint {
  day: string;
  dayEn: string;
  submitted: number;
  active: number;
  sold: number;
}

const DEFAULT_GROWTH_DATA: GrowthPoint[] = [
  { day: "السبت", dayEn: "Sat", submitted: 4, active: 12, sold: 3 },
  { day: "الأحد", dayEn: "Sun", submitted: 7, active: 15, sold: 5 },
  { day: "الإثنين", dayEn: "Mon", submitted: 5, active: 18, sold: 6 },
  { day: "الثلاثاء", dayEn: "Tue", submitted: 9, active: 22, sold: 8 },
  { day: "الأربعاء", dayEn: "Wed", submitted: 6, active: 20, sold: 7 },
  { day: "الخميس", dayEn: "Thu", submitted: 11, active: 26, sold: 10 },
  { day: "الجمعة", dayEn: "Fri", submitted: 8, active: 24, sold: 9 },
];

export function GrowthAreaChart({ data = DEFAULT_GROWTH_DATA }: { data?: GrowthPoint[] }) {
  const { locale, t, formatNumber } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 25, bottom: 35, left: 25 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.active, d.submitted, d.sold]), 30);

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / maxVal) * chartHeight;

  // Generate SVG path for a given metric
  const createAreaPath = (key: "active" | "submitted" | "sold") => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => `${getX(i)},${getY(d[key])}`);
    const firstX = getX(0);
    const lastX = getX(data.length - 1);
    const bottomY = padding.top + chartHeight;
    return `M ${firstX},${bottomY} L ${points.join(" L ")} L ${lastX},${bottomY} Z`;
  };

  const createLinePath = (key: "active" | "submitted" | "sold") => {
    if (data.length === 0) return "";
    const points = data.map((d, i) => `${getX(i)},${getY(d[key])}`);
    return `M ${points.join(" L ")}`;
  };

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <section className="card panel chart-panel" aria-labelledby="growth-chart-heading">
      <div className="panel-head">
        <div>
          <h2 id="growth-chart-heading">{t.dashboard.growthTitle}</h2>
          <p className="panel-copy">
            {locale === "ar"
              ? "معدل الإعلانات النشطة والجديدة والمباعة خلال الأسبوع الحالي."
              : "Velocity of active, submitted, and sold listings across the current week."}
          </p>
        </div>
        <div className="chart-legend">
          <span className="legend-item">
            <i className="legend-dot active" aria-hidden="true" />
            <small>{t.dashboard.activeListings}</small>
          </span>
          <span className="legend-item">
            <i className="legend-dot submitted" aria-hidden="true" />
            <small>{t.dashboard.pendingReview}</small>
          </span>
          <span className="legend-item">
            <i className="legend-dot sold" aria-hidden="true" />
            <small>{t.dashboard.soldListings}</small>
          </span>
        </div>
      </div>

      <div className="chart-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="growth-svg"
          role="img"
          aria-label={t.dashboard.growthTitle}
        >
          <defs>
            <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

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

          {/* Area Fills */}
          <path d={createAreaPath("active")} fill="url(#activeGrad)" />
          <path d={createAreaPath("submitted")} fill="url(#submittedGrad)" />

          {/* Lines */}
          <path
            d={createLinePath("active")}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={createLinePath("submitted")}
            fill="none"
            stroke="var(--color-secondary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 2"
          />
          <path
            d={createLinePath("sold")}
            fill="none"
            stroke="var(--color-info)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />

          {/* Data Points and Interaction columns */}
          {data.map((d, index) => {
            const x = getX(index);
            const activeY = getY(d.active);
            const isHovered = index === hoveredIndex;

            return (
              <g key={d.dayEn}>
                {/* Vertical hover line */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="var(--color-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={x}
                  cy={activeY}
                  r={isHovered ? 5 : 3.5}
                  fill="var(--color-surface)"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                />

                {/* X axis labels */}
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize="11"
                  fontWeight="600"
                >
                  {locale === "ar" ? d.day : d.dayEn}
                </text>

                {/* Interactive column target for hover */}
                <rect
                  x={x - chartWidth / (data.length * 2)}
                  y={padding.top}
                  width={chartWidth / data.length}
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
              insetInlineStart: `${getX(hoveredIndex!) - 10}px`,
            }}
          >
            <strong>{locale === "ar" ? hoveredPoint.day : hoveredPoint.dayEn}</strong>
            <div className="tooltip-row">
              <span className="legend-dot active" />
              <span>{t.dashboard.activeListings}:</span>
              <b>{formatNumber(hoveredPoint.active)}</b>
            </div>
            <div className="tooltip-row">
              <span className="legend-dot submitted" />
              <span>{t.dashboard.pendingReview}:</span>
              <b>{formatNumber(hoveredPoint.submitted)}</b>
            </div>
            <div className="tooltip-row">
              <span className="legend-dot sold" />
              <span>{t.dashboard.soldListings}:</span>
              <b>{formatNumber(hoveredPoint.sold)}</b>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
