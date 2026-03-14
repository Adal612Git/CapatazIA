"use client";

import { BellRing } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { canManageBellIncident, canViewBellIncident } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function BellPage() {
  const currentUser = useCurrentUser();
  const incidents = useAppStore((state) => state.bellIncidents);
  const updateBellIncident = useAppStore((state) => state.updateBellIncident);

  const visibleIncidents = currentUser ? incidents.filter((incident) => canViewBellIncident(currentUser, incident)) : [];

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Campana"
        title="Atencion critica de clientes"
        description="Incidentes abiertos, responsables y tiempos de respuesta para evitar escalaciones ciegas."
      />

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
