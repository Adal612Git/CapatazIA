import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state panel">
      <div className="stack-sm">
        <p className="eyebrow">Estado vacio</p>
        <h3>{title}</h3>
        <p className="module-copy">{body}</p>
      </div>
      {action ? <div className="module-actions">{action}</div> : null}
    </div>
  );
}

export function DemoStepStrip({
  items,
}: {
  items: Array<{ label: string; detail: string; tone?: "default" | "critical" | "success" }>;
}) {
  return (
    <section className="demo-step-strip">
      {items.map((item) => (
        <article key={item.label} className={cn("demo-step-card panel", item.tone === "critical" && "demo-step-card-critical", item.tone === "success" && "demo-step-card-success")}>
          <p className="eyebrow">{item.label}</p>
          <p>{item.detail}</p>
        </article>
      ))}
    </section>
  );
}
