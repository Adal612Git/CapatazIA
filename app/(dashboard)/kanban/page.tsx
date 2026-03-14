"use client";

import { ModuleHeader } from "@/components/module-header";
import { KanbanBoard } from "@/components/kanban-board";

export default function KanbanPage() {
  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Centro del MVP"
        title="Kanban operacional a ancho completo"
        description="Drag and drop, columnas configurables y bloqueo de cierre cuando el checklist no esta completo."
      />
      <KanbanBoard />
    </div>
  );
}
