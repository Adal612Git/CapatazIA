import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "critical" | "warning" | "info" | "success";
  className?: string;
}) {
  const toneClass =
    tone === "critical"
      ? "severity-critical"
      : tone === "warning"
        ? "severity-warning"
        : tone === "info"
          ? "severity-info"
          : tone === "success"
            ? "priority-low"
            : "pill-muted";

  return <span className={cn("pill", toneClass, className)}>{children}</span>;
}

export function KpiCard({
  label,
  value,
  description,
  icon,
  accent = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  description: string;
  icon?: ReactNode;
  accent?: "default" | "report";
  className?: string;
}) {
  return (
    <article className={cn("metric-card panel", accent === "report" && "report-kpi-card", className)}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {icon ? <span className={accent === "report" ? "report-kpi-icon" : undefined}>{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  );
}

export function SectionCard({
  eyebrow,
  title,
  description,
  icon,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel stack-sm", className)}>
      <div className="panel-header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {description ? <p className="module-copy">{description}</p> : null}
        </div>
        {actions ?? icon}
      </div>
      {children}
    </section>
  );
}
