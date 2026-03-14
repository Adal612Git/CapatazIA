"use client";

import { ModuleHeader } from "@/components/module-header";
import { canToggleChecklist } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function ChecklistsPage() {
  const currentUser = useCurrentUser();
  const checklists = useAppStore((state) => state.checklists);
  const tasks = useAppStore((state) => state.tasks);
  const toggleChecklistItem = useAppStore((state) => state.toggleChecklistItem);

  const visibleChecklists = checklists.filter((checklist) => {
    if (currentUser?.role === "operator") {
      return checklist.assigneeId === currentUser.id;
    }
    return true;
  });

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Control operativo"
        title="Nada se cierra a medias"
        description="Checklist por tarea, evidencia minima y bloqueo de cierre cuando falta un paso obligatorio."
      />

      <section className="checklist-grid">
        {visibleChecklists.map((checklist) => {
          const task = tasks.find((entry) => entry.id === checklist.taskId);
          const canEditChecklist = currentUser ? canToggleChecklist(currentUser, checklist) : false;
          return (
            <article key={checklist.id} className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">{checklist.templateName}</p>
                  <h3>{task?.title}</h3>
                </div>
                <span className="pill pill-muted">{checklist.status}</span>
              </div>
              <div className="checklist-stack">
                {checklist.items.map((item) => (
                  <label key={item.id} className="checklist-row">
                    <input
                      checked={item.done}
                      disabled={!canEditChecklist}
                      onChange={() => currentUser && toggleChecklistItem(checklist.id, item.id, currentUser.id)}
                      type="checkbox"
                    />
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.required ? "Paso requerido" : "Paso opcional"}</small>
                    </div>
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
