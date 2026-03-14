"use client";

import { BellRing } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { useAppStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

export default function AlertsPage() {
  const alerts = useAppStore((state) => state.alerts);
  const runtimeSuggestions = useAppStore((state) => state.runtimeSuggestions);
  const markAlertRead = useAppStore((state) => state.markAlertRead);

  const sorted = [...alerts].sort((left, right) => {
    if (left.read !== right.read) return left.read ? 1 : -1;
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[left.severity] - priority[right.severity];
  });

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Eventos criticos"
        title="Alertas internas y visibilidad"
        description="Urgencias arriba, no leidas primero y severidad como criterio de accion."
      />

      <section className="stack-md">
        {sorted.map((alert) => (
          <article key={alert.id} className="panel alert-card">
            <div className="panel-header">
              <div>
                <span className={`pill severity-${alert.severity}`}>{alert.severity}</span>
                <h3>{alert.title}</h3>
              </div>
              <BellRing className="icon-accent" size={18} />
            </div>
            <p>{alert.body}</p>
            <div className="report-row">
              <small>{formatDateTime(alert.createdAt)}</small>
              {!alert.read ? (
                <button className="button-secondary" type="button" onClick={() => markAlertRead(alert.id)}>
                  Marcar leida
                </button>
              ) : (
                <small>Leida</small>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="panel stack-md">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Radar IA</p>
            <h3>Sugerencias activas del Capataz</h3>
          </div>
        </div>
        {runtimeSuggestions.slice(0, 4).map((suggestion) => (
          <article key={suggestion.id} className="detail-card">
            <div className="panel-header">
              <div>
                <span className={`pill severity-${suggestion.severity}`}>{suggestion.severity}</span>
                <h3>{suggestion.title}</h3>
              </div>
            </div>
            <p>{suggestion.body}</p>
          </article>
        ))}
        {!runtimeSuggestions.length ? <p className="module-copy">Todavia no hay sugerencias activas generadas por la IA.</p> : null}
      </section>
    </div>
  );
}
