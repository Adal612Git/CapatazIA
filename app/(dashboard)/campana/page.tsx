"use client";

import { BellRing } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { getDomainConfig } from "@/lib/domain-config";
import { canManageBellIncident, canViewBellIncident } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function BellPage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const incidents = useAppStore((state) => state.bellIncidents);
  const updateBellIncident = useAppStore((state) => state.updateBellIncident);
  const domain = getDomainConfig(systemMode);

  const visibleIncidents = currentUser ? incidents.filter((incident) => canViewBellIncident(currentUser, incident)) : [];
  const openIncidents = visibleIncidents.filter((incident) => incident.status !== "resolved");
  const criticalIncidents = visibleIncidents.filter((incident) => incident.severity === "critical");
  const inProgressIncidents = visibleIncidents.filter((incident) => incident.status === "in_progress");

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Campana"
        title={domain.incidentTitle}
        description={domain.incidentDescription}
        actions={<span className="report-chip">{systemMode === "hospital" ? "Patient experience triage" : "Customer rescue console"}</span>}
      />

      <section className="hero-grid">
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Abiertas</span>
          </div>
          <strong>{openIncidents.length}</strong>
          <p>Casos que siguen afectando experiencia y reputacion.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Criticas</span>
          </div>
          <strong>{criticalIncidents.length}</strong>
          <p>Incidentes que deben subir primero en la lectura.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">En curso</span>
          </div>
          <strong>{inProgressIncidents.length}</strong>
          <p>Casos ya tomados por operacion o gerencia.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Tono</span>
          </div>
          <strong>Triage</strong>
          <p>Severidad clara, accion directa y menos ruido visual.</p>
        </article>
      </section>

      <section className="stack-md">
        {visibleIncidents.map((incident) => (
          <article key={incident.id} className="panel alert-card">
            <div className="panel-header">
              <div>
                <span className={`pill severity-${incident.severity}`}>{incident.severity}</span>
                <h3>{incident.customerName}</h3>
              </div>
              <BellRing className="icon-accent" size={18} />
            </div>
            <p>{incident.summary}</p>
            <div className="report-row">
              <small>
                {incident.agency} | {incident.area} | {incident.status}
              </small>
              {currentUser && canManageBellIncident(currentUser, incident) ? (
                <div className="inline-actions">
                  {incident.status !== "in_progress" ? (
                    <button className="button-secondary" type="button" onClick={() => updateBellIncident(incident.id, "in_progress", currentUser.id)}>
                      Tomar caso
                    </button>
                  ) : null}
                  {incident.status !== "resolved" ? (
                    <button
                      className="button-primary"
                      type="button"
                      onClick={() => updateBellIncident(incident.id, "resolved", currentUser.id, "Cliente atendido y seguimiento asignado.")}
                    >
                      Resolver
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
