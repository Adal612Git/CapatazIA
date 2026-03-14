"use client";

import { PhoneCall } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { canManagePostSaleFollowUp, canViewPostSaleFollowUp, isSalesUser } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function PostSalePage() {
  const currentUser = useCurrentUser();
  const followUps = useAppStore((state) => state.postSaleFollowUps);
  const updatePostSaleFollowUp = useAppStore((state) => state.updatePostSaleFollowUp);

  const visibleFollowUps = currentUser ? followUps.filter((followUp) => canViewPostSaleFollowUp(currentUser, followUp)) : [];

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
        title="Retencion y seguimiento de clientes"
        description="Clientes vendidos, contactos pendientes y riesgos de fuga a otra agencia."
      />

      <section className="team-grid">
        {visibleFollowUps.map((followUp) => (
          <article key={followUp.id} className="panel team-card">
            <div className="panel-header">
              <div>
                <strong>{followUp.customerName}</strong>
                <p>{followUp.vehicleModel}</p>
              </div>
              <span className="pill pill-muted">{followUp.status}</span>
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
                      Contactado
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
