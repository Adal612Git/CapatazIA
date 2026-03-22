"use client";

import { CarFront, ClipboardList, HandCoins, TimerReset } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { getDomainConfig } from "@/lib/domain-config";
import { canViewProspect, canViewTask, canViewTestDrive, isSalesUser } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function DailyHuddlePage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const prospects = useAppStore((state) => state.prospects);
  const testDrives = useAppStore((state) => state.testDrives);
  const tasks = useAppStore((state) => state.tasks);
  const users = useAppStore((state) => state.users);
  const domain = getDomainConfig(systemMode);

  const visibleProspects = currentUser ? prospects.filter((prospect) => canViewProspect(currentUser, prospect)) : [];
  const visibleTestDrives = currentUser ? testDrives.filter((testDrive) => canViewTestDrive(currentUser, testDrive)) : [];
  const focusTags =
    systemMode === "hospital"
      ? ["admisiones", "camas", "alta", "seguro", "quirofano", "incidente"]
      : ["ventas", "pipeline", "guardia", "credito", "subvencion", "usado"];
  const scopedTasks = tasks.filter((task) => task.tags.some((tag) => focusTags.includes(tag)));
  const visibleTasks = currentUser ? scopedTasks.filter((task) => canViewTask(currentUser, task, users)) : [];

  if (!currentUser || !isSalesUser(currentUser)) {
    return (
      <div className="stack-lg">
        <ModuleHeader
          eyebrow={systemMode === "hospital" ? "Huddle" : "Junta diaria"}
          title="Vista restringida por area"
          description={
            systemMode === "hospital"
              ? "El huddle operativo solo esta disponible para admisiones, direccion general y corporativo."
              : "La junta comercial solo esta disponible para ventas, gerencia general y corporativo."
          }
        />
        <section className="panel">
          <div className="status status-warning">Tu perfil actual no tiene acceso a esta junta operativa.</div>
        </section>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow={systemMode === "hospital" ? "Huddle clinico" : "Junta diaria"}
        title={systemMode === "hospital" ? "Ingresos, camas y riesgos del turno" : "Pipeline comercial y pendientes del dia"}
        description={
          systemMode === "hospital"
            ? "Admisiones, valoraciones, autorizaciones e incidentes listos para la junta operativa."
            : "Prospectos, pruebas de manejo, bloqueos y cierres probables listos para la junta comercial."
        }
      />

      <section className="hero-grid">
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">{systemMode === "hospital" ? "Ingresos vivos" : "Prospectos vivos"}</span>
            <ClipboardList className="icon-accent" size={18} />
          </div>
          <strong>{visibleProspects.filter((prospect) => prospect.status !== "closed_lost" && prospect.status !== "closed_won").length}</strong>
          <p>{systemMode === "hospital" ? "Pacientes programados y casos por confirmar hoy." : "Clientes nuevos y en seguimiento que requieren empuje hoy."}</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">{systemMode === "hospital" ? "Valoraciones" : "Pruebas agendadas"}</span>
            <CarFront className="icon-accent" size={18} />
          </div>
          <strong>{visibleTestDrives.filter((testDrive) => testDrive.status === "scheduled").length}</strong>
          <p>{systemMode === "hospital" ? "Agenda clinica temprana para sostener flujo del dia." : "Indicador directo de pipeline sano para el cierre del mes."}</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">{systemMode === "hospital" ? "Casos bloqueados" : "Operaciones bloqueadas"}</span>
            <TimerReset className="icon-accent icon-rose" size={18} />
          </div>
          <strong>{visibleTasks.filter((task) => task.columnId === "blocked").length}</strong>
          <p>{systemMode === "hospital" ? "Autorizaciones, camas o pases deteniendo ingresos." : "Avaluos, descuentos o expedientes que frenan cierres."}</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">{systemMode === "hospital" ? "Cobertura / seguros" : "Subvencion / credito"}</span>
            <HandCoins className="icon-accent icon-amber" size={18} />
          </div>
          <strong>{visibleTasks.filter((task) => task.tags.includes(systemMode === "hospital" ? "seguro" : "credito")).length}</strong>
          <p>{systemMode === "hospital" ? "Casos que requieren trazabilidad con aseguradora y admision." : "Requieren trazabilidad para no perder margen ni metas de financiera."}</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack-sm">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Ingresos" : "Prospectos"}</p>
              <h3>{systemMode === "hospital" ? "Coordinacion del turno" : "Seguimiento del dia"}</h3>
            </div>
          </div>
          {visibleProspects.map((prospect) => {
            const seller = users.find((user) => user.id === prospect.salespersonId);
            return (
              <div key={prospect.id} className="detail-card">
                <strong>{prospect.customerName}</strong>
                <p>{prospect.vehicleInterest}</p>
                <small>
                  {seller?.name ?? (systemMode === "hospital" ? "Sin coordinador" : "Sin vendedor")} | {domain.prospectStatusLabels[prospect.status]} | {prospect.source}
                </small>
              </div>
            );
          })}
        </article>

        <article className="panel stack-sm">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Valoraciones" : "Pruebas de manejo"}</p>
              <h3>{systemMode === "hospital" ? "Agenda clinica" : "Agenda comercial"}</h3>
            </div>
          </div>
          {visibleTestDrives.map((testDrive) => {
            const prospect = visibleProspects.find((entry) => entry.id === testDrive.prospectId) ?? prospects.find((entry) => entry.id === testDrive.prospectId);
            return (
              <div key={testDrive.id} className="detail-card">
                <strong>{testDrive.vehicleModel}</strong>
                <p>{prospect?.customerName ?? (systemMode === "hospital" ? "Paciente no encontrado" : "Prospecto no encontrado")}</p>
                <small>{domain.testDriveStatusLabels[testDrive.status]} | {testDrive.scheduledAt.slice(0, 16).replace("T", " ")}</small>
              </div>
            );
          })}
        </article>
      </section>
    </div>
  );
}
