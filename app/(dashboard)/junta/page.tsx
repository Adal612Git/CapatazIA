"use client";

import { CarFront, ClipboardList, HandCoins, TimerReset } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { canViewProspect, canViewTask, canViewTestDrive, isSalesUser } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function DailyHuddlePage() {
  const currentUser = useCurrentUser();
  const prospects = useAppStore((state) => state.prospects);
  const testDrives = useAppStore((state) => state.testDrives);
  const tasks = useAppStore((state) => state.tasks);
  const users = useAppStore((state) => state.users);

  const visibleProspects = currentUser ? prospects.filter((prospect) => canViewProspect(currentUser, prospect)) : [];
  const visibleTestDrives = currentUser ? testDrives.filter((testDrive) => canViewTestDrive(currentUser, testDrive)) : [];
  const commercialTasks = tasks.filter((task) =>
    task.tags.some((tag) => ["ventas", "pipeline", "guardia", "credito", "subvencion", "usado"].includes(tag)),
  );
  const visibleTasks = currentUser ? commercialTasks.filter((task) => canViewTask(currentUser, task, users)) : [];

  if (!currentUser || !isSalesUser(currentUser)) {
    return (
      <div className="stack-lg">
        <ModuleHeader
          eyebrow="Junta diaria"
          title="Vista restringida por area"
          description="La junta comercial solo esta disponible para ventas, gerencia general y corporativo."
        />
        <section className="panel">
          <div className="status status-warning">Tu perfil actual no tiene acceso a la junta comercial.</div>
        </section>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Junta diaria"
        title="Pipeline comercial y pendientes del dia"
        description="Prospectos, pruebas de manejo, bloqueos y cierres probables listos para la junta comercial."
      />

      <section className="hero-grid">
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Prospectos vivos</span>
            <ClipboardList className="icon-accent" size={18} />
          </div>
          <strong>{visibleProspects.filter((prospect) => prospect.status !== "closed_lost" && prospect.status !== "closed_won").length}</strong>
          <p>Clientes nuevos y en seguimiento que requieren empuje hoy.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Pruebas agendadas</span>
            <CarFront className="icon-accent" size={18} />
          </div>
          <strong>{visibleTestDrives.filter((testDrive) => testDrive.status === "scheduled").length}</strong>
          <p>Indicador directo de pipeline sano para el cierre del mes.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Operaciones bloqueadas</span>
            <TimerReset className="icon-accent icon-rose" size={18} />
          </div>
          <strong>{visibleTasks.filter((task) => task.columnId === "blocked").length}</strong>
          <p>Avalúos, descuentos o expedientes que frenan cierres.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Subvenciones / credito</span>
            <HandCoins className="icon-accent icon-amber" size={18} />
          </div>
          <strong>{visibleTasks.filter((task) => task.tags.includes("subvencion") || task.tags.includes("credito")).length}</strong>
          <p>Requieren trazabilidad para no perder margen ni metas de financiera.</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack-sm">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Prospectos</p>
              <h3>Seguimiento del dia</h3>
            </div>
          </div>
          {visibleProspects.map((prospect) => {
            const seller = users.find((user) => user.id === prospect.salespersonId);
            return (
              <div key={prospect.id} className="detail-card">
                <strong>{prospect.customerName}</strong>
                <p>{prospect.vehicleInterest}</p>
                <small>
                  {seller?.name ?? "Sin vendedor"} | {prospect.status} | {prospect.source}
                </small>
              </div>
            );
          })}
        </article>

        <article className="panel stack-sm">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Pruebas de manejo</p>
              <h3>Agenda comercial</h3>
            </div>
          </div>
          {visibleTestDrives.map((testDrive) => {
            const prospect = visibleProspects.find((entry) => entry.id === testDrive.prospectId) ?? prospects.find((entry) => entry.id === testDrive.prospectId);
            return (
              <div key={testDrive.id} className="detail-card">
                <strong>{testDrive.vehicleModel}</strong>
                <p>{prospect?.customerName ?? "Prospecto no encontrado"}</p>
                <small>{testDrive.status} | {testDrive.scheduledAt.slice(0, 16).replace("T", " ")}</small>
              </div>
            );
          })}
        </article>
      </section>
    </div>
  );
}
