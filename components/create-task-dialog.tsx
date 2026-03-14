"use client";

import { useMemo, useState } from "react";
import { taskInputSchema } from "@/lib/contracts";
import { canCreateTasks } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { defaultDueAtInput } from "@/lib/utils";
import type { Priority } from "@/lib/types";

const priorities: Priority[] = ["low", "medium", "high", "critical"];

export function CreateTaskDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const currentUser = useCurrentUser();
  const allUsers = useAppStore((state) => state.users);
  const createTask = useAppStore((state) => state.createTask);
  const users = useMemo(
    () => allUsers.filter((user) => user.role !== "owner" && user.role !== "admin"),
    [allUsers],
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState(users[0]?.id ?? "");
  const [dueAt, setDueAt] = useState(defaultDueAtInput);
  const [location, setLocation] = useState("Guadalajara Centro");
  const [tags, setTags] = useState("campo, prioridad");
  const [requiresChecklist, setRequiresChecklist] = useState(true);
  const [error, setError] = useState("");
  const effectiveAssigneeId = assigneeId || users[0]?.id || "";

  if (!open || !currentUser || !canCreateTasks(currentUser.role)) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quick action</p>
            <h3>Nueva tarea operativa</h3>
          </div>
          <button type="button" className="button-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const dueAtDate = new Date(dueAt);
            if (Number.isNaN(dueAtDate.getTime())) {
              setError("La fecha limite no es valida");
              return;
            }
            const payload = {
              title,
              description,
              priority,
              assigneeId: effectiveAssigneeId,
              dueAt: dueAtDate.toISOString(),
              location,
              tags: tags
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              requiresChecklist,
            };

            const parsed = taskInputSchema.safeParse(payload);
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "No se pudo validar la tarea");
              return;
            }

            const result = createTask(payload, currentUser.id);
            if (!result.ok) {
              setError(result.message ?? "No fue posible crear la tarea");
              return;
            }

            setTitle("");
            setDescription("");
            setTags("campo, prioridad");
            setDueAt(defaultDueAtInput());
            setError("");
            onClose();
          }}
        >
          <label className="field field-span-2">
            <span>Titulo</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nueva orden de inspeccion" />
          </label>
          <label className="field field-span-2">
            <span>Descripcion</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
          </label>
          <label className="field">
            <span>Prioridad</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
              {priorities.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Responsable</span>
            <select value={effectiveAssigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fecha limite</span>
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </label>
          <label className="field">
            <span>Ubicacion</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
          <label className="field field-span-2">
            <span>Tags</span>
            <input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label className="checkbox-row field-span-2">
            <input checked={requiresChecklist} onChange={(event) => setRequiresChecklist(event.target.checked)} type="checkbox" />
            <span>La tarea requiere checklist obligatorio para cerrarse.</span>
          </label>
          {error ? <div className="status status-danger field-span-2">{error}</div> : null}
          <div className="field-span-2 inline-actions">
            <button className="button-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button-primary" type="submit">
              Crear tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
