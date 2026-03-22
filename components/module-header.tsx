import type { ReactNode } from "react";

export function ModuleHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="module-header">
      <div className="module-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="module-copy">{description}</p>
      </div>
      {actions ? <div className="module-actions">{actions}</div> : null}
    </div>
  );
}
