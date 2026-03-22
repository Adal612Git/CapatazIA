"use client";

import { Building2, ShieldAlert, Trophy } from "lucide-react";
import { buildAgencyMetrics, collectAgencyNames } from "@/lib/automotive";
import { ModuleHeader } from "@/components/module-header";
import { getDomainConfig } from "@/lib/domain-config";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function MultiAgencyPage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const users = useAppStore((state) => state.users);
  const prospects = useAppStore((state) => state.prospects);
  const testDrives = useAppStore((state) => state.testDrives);
  const salesOperations = useAppStore((state) => state.salesOperations);
  const creditFiles = useAppStore((state) => state.creditFiles);
  const bellIncidents = useAppStore((state) => state.bellIncidents);
  const postSaleFollowUps = useAppStore((state) => state.postSaleFollowUps);
  const domain = getDomainConfig(systemMode);

  const agencies = collectAgencyNames({
    users,
    prospects,
    testDrives,
    salesOperations,
    creditFiles,
    incidents: bellIncidents,
    followUps: postSaleFollowUps,
  });
  const metrics = buildAgencyMetrics({
    agencies,
    prospects,
    testDrives,
    salesOperations,
    creditFiles,
    incidents: bellIncidents,
    followUps: postSaleFollowUps,
  }).sort((left, right) => right.wonOperations - left.wonOperations || right.readyToClose - left.readyToClose);

  const topAgency = metrics[0];
  const riskAgency = [...metrics].sort((left, right) => right.openIncidents + right.atRiskPostSale - (left.openIncidents + left.atRiskPostSale))[0];

  if (currentUser?.role !== "admin") {
    return (
      <div className="stack-lg">
        <ModuleHeader
          eyebrow="Multisucursal"
          title="Vista corporativa restringida"
          description="Este comparativo esta reservado para Director o Gerente de Marca con visibilidad global."
        />
        <section className="panel">
          <div className="status status-warning">Tu perfil actual no tiene visibilidad multisucursal completa.</div>
        </section>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Multisucursal"
        title={domain.multisiteTitle}
        description={domain.multisiteDescription}
      />

      <section className="hero-grid">
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">{systemMode === "hospital" ? "Hospital lider" : "Agencia lider"}</span>
            <Trophy className="icon-accent icon-amber" size={18} />
          </div>
          <strong>{topAgency?.agency ?? "--"}</strong>
          <p>{topAgency ? `${topAgency.wonOperations} cierres ganados y ${topAgency.readyToClose} listos para remate.` : "Sin datos."}</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Foco rojo</span>
            <ShieldAlert className="icon-accent icon-rose" size={18} />
          </div>
          <strong>{riskAgency?.agency ?? "--"}</strong>
          <p>{riskAgency ? `${riskAgency.openIncidents} campanas y ${riskAgency.atRiskPostSale} post-ventas en riesgo.` : "Sin datos."}</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">{systemMode === "hospital" ? "Hospitales" : "Agencias"}</span>
            <Building2 className="icon-accent" size={18} />
          </div>
          <strong>{metrics.length}</strong>
          <p>Sedes comparadas en el mismo runtime.</p>
        </article>
      </section>

      <section className="comparison-grid">
        {metrics.map((agency) => (
          <article key={agency.agency} className="panel agency-card stack-md">
            <div className="panel-header">
              <div>
                <p className="eyebrow">{systemMode === "hospital" ? "Hospital" : "Agencia"}</p>
                <h3>{agency.agency}</h3>
              </div>
              <span className="pill pill-muted">{agency.creditApprovalRate}% aprobacion</span>
            </div>

            <div className="agency-metric-grid">
              <div className="agency-metric">
                <strong>{agency.activeProspects}</strong>
                <span>Prospectos vivos</span>
              </div>
              <div className="agency-metric">
                <strong>{agency.scheduledTestDrives}</strong>
                <span>Pruebas agendadas</span>
              </div>
              <div className="agency-metric">
                <strong>{agency.activeOperations}</strong>
                <span>Operaciones vivas</span>
              </div>
              <div className="agency-metric">
                <strong>{agency.readyToClose}</strong>
                <span>Listas para cierre</span>
              </div>
              <div className="agency-metric">
                <strong>{agency.missingCreditFiles}</strong>
                <span>Expedientes trabados</span>
              </div>
              <div className="agency-metric">
                <strong>{agency.wonOperations}</strong>
                <span>Cierres ganados</span>
              </div>
            </div>

            <div className="timeline-stack">
              <div className="timeline-row soft-section">
                <strong>Campana activa</strong>
                <p>{agency.openIncidents}</p>
              </div>
              <div className="timeline-row soft-section">
                <strong>Post-venta en riesgo</strong>
                <p>{agency.atRiskPostSale}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
