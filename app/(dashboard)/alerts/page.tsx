"use client";

import { BellRing } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { KpiCard, SectionCard, StatusPill } from "@/components/ui/surface-primitives";
import { getDomainConfig } from "@/lib/domain-config";
import { useAppStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

export default function AlertsPage() {
  const systemMode = useAppStore((state) => state.systemMode);
  const alerts = useAppStore((state) => state.alerts);
  const runtimeSuggestions = useAppStore((state) => state.runtimeSuggestions);
  const markAlertRead = useAppStore((state) => state.markAlertRead);
  const domain = getDomainConfig(systemMode);

  const sorted = [...alerts].sort((left, right) => {
    if (left.read !== right.read) return left.read ? 1 : -1;
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[left.severity] - priority[right.severity];
  });
  const unread = alerts.filter((alert) => !alert.read);
  const critical = alerts.filter((alert) => alert.severity === "critical");

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow={systemMode === "hospital" ? "Riesgos operativos" : "Eventos criticos"}
        title={systemMode === "hospital" ? "Incidentes, alertas y visibilidad" : "Alertas internas y visibilidad"}
        description={
          systemMode === "hospital"
            ? "Riesgos de paciente, autorizaciones, continuidad de alta y severidad como criterio de accion."
            : "Urgencias arriba, no leidas primero y severidad como criterio de accion."
        }
        actions={<span className="report-chip">Command triage</span>}
      />

      <section className="hero-grid">
        <KpiCard label="No leidas" value={unread.length} description="Entradas que siguen activas para triage inmediato." />
        <KpiCard label="Criticas" value={critical.length} description="Eventos que ya comprometen experiencia, ritmo o continuidad." />
        <KpiCard label="Sugerencias IA" value={runtimeSuggestions.length} description="Capataz propone focos concretos, no ruido decorativo." />
        <KpiCard label="Modo" value="Triage" description="Severidad arriba, lectura limpia y resolucion rapida." />
      </section>

      <div className="stack-md">
        {sorted.map((alert) => (
          <SectionCard
            key={alert.id}
            title={alert.title}
            actions={
              <StatusPill tone={alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info"}>
                {alert.severity}
              </StatusPill>
            }
            icon={<BellRing className="icon-accent" size={18} />}
          >
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
          </SectionCard>
        ))}
      </div>

      <SectionCard eyebrow="Radar IA" title="Sugerencias activas del Capataz">
        {runtimeSuggestions.slice(0, 4).map((suggestion) => (
          <article key={suggestion.id} className="detail-card">
            <div className="panel-header">
              <div>
                <StatusPill tone={suggestion.severity === "critical" ? "critical" : suggestion.severity === "warning" ? "warning" : "info"}>
                  {suggestion.severity}
                </StatusPill>
                <h3>{suggestion.title}</h3>
              </div>
            </div>
            <p>{suggestion.body}</p>
          </article>
        ))}
        {!runtimeSuggestions.length ? <p className="module-copy">Todavia no hay sugerencias activas generadas por la IA.</p> : null}
      </SectionCard>
    </div>
  );
}
