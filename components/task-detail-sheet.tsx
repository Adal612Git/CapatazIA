"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, MapPin, PencilLine, Save, Sparkles, X } from "lucide-react";
import { canEditTask, canMoveTask, canToggleChecklist, canViewTask } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";
import type { ChecklistInstance, Priority, Task, User } from "@/lib/types";
import { formatDateTime, formatDateTimeInput, relativeTime } from "@/lib/utils";

const priorityOptions: Priority[] = ["low", "medium", "high", "critical"];

function TaskDetailBody({
  currentUser,
  task,
  assignee,
  checklist,
  users,
}: {
  currentUser: User;
  task: Task;
  assignee: User | null;
  checklist: ChecklistInstance | null;
  users: User[];
}) {
  const selectTask = useAppStore((state) => state.selectTask);
  const moveTask = useAppStore((state) => state.moveTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const toggleChecklistItem = useAppStore((state) => state.toggleChecklistItem);
  const [feedback, setFeedback] = useState("");
  const [blockedReason, setBlockedReason] = useState(task.blockedReason ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editDueAt, setEditDueAt] = useState(formatDateTimeInput(task.dueAt));
  const canMoveCurrentTask = canMoveTask(currentUser, task, users);
  const canEditCurrentTask = canEditTask(currentUser, task, users);
  const canEditChecklist = checklist ? canToggleChecklist(currentUser, checklist) : false;

  return (
    <aside className="detail-sheet panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Detalle de tarea</p>
          <h3>{task.title}</h3>
        </div>
        <button className="icon-button" type="button" onClick={() => selectTask(null)}>
          <X size={18} />
        </button>
      </div>

      <div className="detail-meta">
        <span className={`pill priority-${task.priority}`}>{task.priority}</span>
        <span className="pill">
          <Clock3 size={14} />
          {formatDateTime(task.dueAt)}
        </span>
        <span className="pill">
          <MapPin size={14} />
          {task.location}
        </span>
      </div>

      <p className="detail-copy">{task.description}</p>

      <div className="detail-card">
        <strong>Responsable</strong>
        <p>
          {assignee?.name} - {assignee?.site}
        </p>
        <small>Actualizada {relativeTime(task.updatedAt)}</small>
      </div>

      {canEditCurrentTask ? (
        <div className="detail-card">
          <div className="panel-header">
            <div>
              <strong>Editar tarea</strong>
              <p>Modifica prioridad y fecha limite sin salir del tablero.</p>
            </div>
            {!isEditing ? (
              <button className="button-secondary" type="button" onClick={() => setIsEditing(true)}>
                <PencilLine size={16} />
                Editar
              </button>
            ) : null}
          </div>

          {isEditing ? (
            <div className="stack-sm">
              <label className="field">
                <span>Prioridad</span>
                <select value={editPriority} onChange={(event) => setEditPriority(event.target.value as Priority)}>
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Fecha limite</span>
                <input type="datetime-local" value={editDueAt} onChange={(event) => setEditDueAt(event.target.value)} />
              </label>
              <div className="inline-actions">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => {
                    setEditPriority(task.priority);
                    setEditDueAt(formatDateTimeInput(task.dueAt));
                    setIsEditing(false);
                    setFeedback("");
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="button-primary"
                  type="button"
                  onClick={() => {
                    const dueAtDate = new Date(editDueAt);
                    if (Number.isNaN(dueAtDate.getTime())) {
                      setFeedback("La fecha limite no es valida.");
                      return;
                    }
                    const result = updateTask(
                      task.id,
                      {
                        priority: editPriority,
                        dueAt: dueAtDate.toISOString(),
                      },
                      currentUser.id,
                    );
                    setFeedback(result.message ?? "Cambios guardados y visibles.");
                    if (result.ok) {
                      setIsEditing(false);
                    }
                  }}
                >
                  <Save size={16} />
                  Guardar cambios
                </button>
              </div>
            </div>
          ) : (
            <div className="report-row">
              <div>
                <strong>Prioridad actual</strong>
                <p>{task.priority}</p>
              </div>
              <div>
                <strong>Fecha actual</strong>
                <p>{formatDateTime(task.dueAt)}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {canMoveCurrentTask ? (
        <>
          <label className="field">
            <span>Motivo de bloqueo</span>
            <textarea
              rows={3}
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
              placeholder="Describe el bloqueo real para que el equipo pueda destrabarlo"
            />
          </label>
          <div className="detail-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={() => {
                const result = moveTask(task.id, "blocked", currentUser.id, { blockedReason });
                setFeedback(result.message ?? "Tarea marcada como bloqueada.");
              }}
            >
              <AlertTriangle size={16} />
              Bloquear
            </button>
            <button
              className="button-primary"
              type="button"
              onClick={() => {
                const result = moveTask(task.id, "done", currentUser.id);
                setFeedback(result.message ?? "Tarea cerrada.");
              }}
            >
              <CheckCircle2 size={16} />
              Cerrar tarea
            </button>
          </div>
        </>
      ) : (
        <div className="status status-warning">Tu rol puede consultar esta tarea, pero no cambiar su estado.</div>
      )}

      {feedback ? <div className="status status-warning">{feedback}</div> : null}

      {task.blockedReason ? (
        <div className="detail-card">
          <strong>Bloqueo actual</strong>
          <p>{task.blockedReason}</p>
        </div>
      ) : null}

      {checklist ? (
        <div className="detail-card">
          <div className="panel-header">
            <div>
              <strong>{checklist.templateName}</strong>
              <p>Checklist obligatorio vinculado a esta tarea.</p>
            </div>
            <Sparkles className="icon-accent" size={18} />
          </div>
          <div className="checklist-stack">
            {checklist.items.map((item) => (
              <label key={item.id} className="checklist-row">
                <input
                  checked={item.done}
                  disabled={!canEditChecklist}
                  onChange={() => {
                    const result = toggleChecklistItem(checklist.id, item.id, currentUser.id);
                    setFeedback(result.message ?? "");
                  }}
                  type="checkbox"
                />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.required ? "Requerido para cierre" : "Opcional"}</small>
                </div>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export function TaskDetailSheet() {
  const currentUser = useCurrentUser();
  const selectedTaskId = useAppStore((state) => state.selectedTaskId);
  const users = useAppStore((state) => state.users);
  const task = useAppStore((state) => state.tasks.find((entry) => entry.id === selectedTaskId));
  const assignee = useAppStore((state) => state.users.find((entry) => entry.id === task?.assigneeId) ?? null);
  const checklist = useAppStore((state) => state.checklists.find((entry) => entry.id === task?.checklistInstanceId) ?? null);

  if (!task || !currentUser || !canViewTask(currentUser, task, users)) {
    return null;
  }

  return <TaskDetailBody key={task.id} currentUser={currentUser} task={task} assignee={assignee} checklist={checklist} users={users} />;
}
