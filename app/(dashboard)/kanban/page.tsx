"use client";

import { ModuleHeader } from "@/components/module-header";
import { DemoStepStrip } from "@/components/ui/runtime-states";
import { KanbanBoard } from "@/components/kanban-board";

export default function KanbanPage() {
  const flowRules = [
    { label: "Pendiente", detail: "Entrada controlada. Nada entra si ya reventaste WIP." },
    { label: "En proceso", detail: "Trabajo visible por responsable y fecha compromiso." },
    { label: "Bloqueada", detail: "Si se atora, exige motivo real y queda expuesto.", tone: "critical" as const },
    { label: "Completada", detail: "No cierra si el checklist requerido esta incompleto.", tone: "success" as const },
  ];

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Centro del MVP"
        title="Kanban operacional a ancho completo"
        description="Drag and drop, columnas configurables y bloqueo de cierre cuando el checklist no esta completo."
      />
      <DemoStepStrip items={flowRules} />
      <KanbanBoard />
    </div>
  );
}
