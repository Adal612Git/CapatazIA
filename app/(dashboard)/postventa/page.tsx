"use client";

import { PhoneCall } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { getDomainConfig } from "@/lib/domain-config";
import { canManagePostSaleFollowUp, canViewPostSaleFollowUp, isSalesUser } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function PostSalePage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const followUps = useAppStore((state) => state.postSaleFollowUps);
  const updatePostSaleFollowUp = useAppStore((state) => state.updatePostSaleFollowUp);
  const domain = getDomainConfig(systemMode);

  const visibleFollowUps = currentUser ? followUps.filter((followUp) => canViewPostSaleFollowUp(currentUser, followUp)) : [];
  const pendingFollowUps = visibleFollowUps.filter((followUp) => followUp.status === "pending");
  const atRiskFollowUps = visibleFollowUps.filter((followUp) => followUp.status === "at_risk");
  const closedFollowUps = visibleFollowUps.filter((followUp) => followUp.status === "closed");

  if (!currentUser || !isSalesUser(currentUser)) {
    return (
      <div className="stack-lg">
        <ModuleHeader
          eyebrow="Post-venta"
          title="Vista restringida por area"
          description="El seguimiento post-venta comercial solo aplica a ventas, gerencia general y corporativo."
        />
        <section className="panel">
          <div className="status status-warning">Tu perfil actual no tiene acceso al modulo de post-venta comercial.</div>
        </section>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Post-venta"
        title={domain.postSaleTitle}
        description={domain.postSaleDescription}
        actions={<span className="report-chip">{systemMode === "hospital" ? "Continuity follow-up" : "Retention follow-up"}</span>}
      />

      <section className="hero-grid">
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Pendientes</span>
          </div>
          <strong>{pendingFollowUps.length}</strong>
          <p>Contactos que aun requieren accion o llamada.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">En riesgo</span>
          </div>
          <strong>{atRiskFollowUps.length}</strong>
          <p>Relaciones que piden contencion inmediata.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Cerrados</span>
          </div>
          <strong>{closedFollowUps.length}</strong>
          <p>Seguimientos ya resueltos dentro del ciclo.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Enfoque</span>
          </div>
          <strong>Retencion</strong>
          <p>Lectura humana mas premium y accionable por cuenta.</p>
        </article>
      </section>

      <section className="team-grid">
        {visibleFollowUps.map((followUp) => (
          <article key={followUp.id} className="panel team-card">
            <div className="panel-header">
              <div>
                <strong>{followUp.customerName}</strong>
                <p>{followUp.vehicleModel}</p>
              </div>
              <span className="pill pill-muted">{domain.postSaleStatusLabels[followUp.status]}</span>
            </div>
            <p>{followUp.nextStep}</p>
            <div className="report-row">
              <small>
                {followUp.agency} | vence {followUp.dueAt.slice(0, 16).replace("T", " ")}
              </small>
              {currentUser && canManagePostSaleFollowUp(currentUser, followUp) ? (
                <div className="inline-actions">
                  {followUp.status !== "contacted" ? (
                    <button className="button-secondary" type="button" onClick={() => updatePostSaleFollowUp(followUp.id, "contacted", currentUser.id)}>
                      <PhoneCall size={14} />
                      {systemMode === "hospital" ? "Contactar" : "Contactado"}
                    </button>
                  ) : null}
                  {followUp.status !== "at_risk" ? (
                    <button className="button-ghost" type="button" onClick={() => updatePostSaleFollowUp(followUp.id, "at_risk", currentUser.id)}>
                      En riesgo
                    </button>
                  ) : null}
                  {followUp.status !== "closed" ? (
                    <button className="button-primary" type="button" onClick={() => updatePostSaleFollowUp(followUp.id, "closed", currentUser.id)}>
                      Cerrar
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
