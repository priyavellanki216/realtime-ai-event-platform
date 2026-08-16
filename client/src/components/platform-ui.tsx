import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type Severity = "critical" | "warning" | "info";

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function timeAgo(timestamp: number | null) {
  if (!timestamp) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(timestamp);
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={cn("severity-badge", `severity-${severity}`)}><span className="severity-dot" />{severity}</span>;
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}

export function Panel({ children, className, title, subtitle, action }: { children: ReactNode; className?: string; title?: string; subtitle?: string; action?: ReactNode }) {
  return (
    <section className={cn("panel", className)}>
      {(title || action) && <div className="panel-header">
        <div>
          {title && <h2>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>}
      {children}
    </section>
  );
}

export function Sparkline({ points, color = "#7cfcda" }: { points: number[]; color?: string }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const width = 146;
  const height = 42;
  const coordinates = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * width;
    const y = height - 5 - ((point - min) / Math.max(max - min, 1)) * (height - 10);
    return `${x},${y}`;
  }).join(" ");
  const fill = `0,${height} ${coordinates} ${width},${height}`;
  return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><defs><linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor={color} stopOpacity=".34"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs><polygon points={fill} fill={`url(#gradient-${color.replace("#", "")})`} /><polyline points={coordinates} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function MetricCard({ label, value, unit, trend, points, tone = "mint", footer }: { label: string; value: string; unit?: string; trend: string; points: number[]; tone?: "mint" | "blue" | "violet" | "amber"; footer?: string }) {
  const colors = { mint: "#7cfcda", blue: "#71a7ff", violet: "#aa8dff", amber: "#f7b95a" };
  return <Panel className={`metric-card metric-${tone}`}>
    <div className="metric-topline"><span>{label}</span><span className="metric-trend">{trend}</span></div>
    <div className="metric-value"><strong>{value}</strong>{unit && <span>{unit}</span>}</div>
    <Sparkline points={points} color={colors[tone]} />
    {footer && <p className="metric-footer">{footer}</p>}
  </Panel>;
}

export function Histogram({ values }: { values: number[] }) {
  return <div className="histogram" aria-label="Latency histogram">{values.map((value, index) => <span key={index} style={{ height: `${Math.max(12, value)}%` }} />)}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><p>{title}</p><span>{description}</span></div>;
}
