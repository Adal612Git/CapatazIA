"use client";

import { useState } from "react";
import { CalendarDays, ListFilter, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ModuleHeader } from "@/components/module-header";
import { canMoveTask } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { cn, formatDateTime } from "@/lib/utils";

export default function TasksPage() {
  const currentUser = useCurrentUser();
  const users = useAppStore((state) => state.users);
  const tasks = useAppStore((state) => state.tasks);
  const moveTask = useAppStore((state) => state.moveTask);
  const selectTask = useAppStore((state) => state.selectTask);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [dueDate, setDueDate] = useState("");

  const visibleTasks = tasks.filter((task) => {
    if (currentUser?.role === "operator" && task.assigneeId !== currentUser.id) return false;
    if (priority !== "all" && task.priority !== priority) return false;
    if (status !== "all" && task.columnId !== status) return false;
    if (dueDate && format(parseISO(task.dueAt), "yyyy-MM-dd") !== dueDate) return false;
    return `${task.title} ${task.description} ${task.location}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Operacion diaria"
        title="Lista ejecutiva de tareas"
        description="Junta diaria, seguimientos, pruebas de manejo, campana y post-venta con visibilidad completa."
      />

      <section className="filter-bar panel">
        <label className="search-field">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarea, cliente, agencia o contexto" />
        </label>
        <label className="select-field">
          <ListFilter size={16} />
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="all">Todas las prioridades</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="select-field">
          <ListFilter size={16} />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En proceso</option>
            <option value="blocked">Bloqueada</option>
            <option value="done">Completada</option>
          </select>
        </label>
        <label className="date-field">
          <CalendarDays size={16} />
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        {query || priority !== "all" || status !== "all" || dueDate ? (
          <button
            className="button-secondary"
            type="button"
            onClick={() => {
              setQuery("");
              setPriority("all");
              setStatus("all");
              setDueDate("");
            }}
          >
            Limpiar filtros
          </button>
        ) : null}
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Vence</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.length ? (
                visibleTasks.map((task) => {
                  const assignee = users.find((user) => user.id === task.assigneeId);
                  const canActOnTask = currentUser ? canMoveTask(currentUser, task, users) : false;
                  return (
                    <tr key={task.id}>
                      <td>
                        <button className="table-link" type="button" onClick={() => selectTask(task.id)}>
                          {task.title}
                        </button>
                        <small>{task.location}</small>
                      </td>
                      <td>
                        {assignee?.name}
                        <small>{assignee?.site}</small>
                      </td>
                      <td>
                        <span className="pill pill-muted">{task.columnId}</span>
                      </td>
                      <td>
                        <span className={cn("pill", `priority-${task.priority}`)}>{task.priority}</span>
                      </td>
                      <td>{formatDateTime(task.dueAt)}</td>
                      <td>
                        {canActOnTask ? (
                          <div className="inline-actions">
                            <button
                              className="button-secondary"
                              type="button"
                              onClick={() => currentUser && moveTask(task.id, "in_progress", currentUser.id)}
                            >
                              Tomar
                            </button>
                            <button
                              className="button-primary"
                              type="button"
                              onClick={() => currentUser && moveTask(task.id, "done", currentUser.id)}
                            >
                              Cerrar
                            </button>
                          </div>
                        ) : (
                          <small>Solo lectura</small>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="status status-warning">No hay tareas que coincidan con los filtros actuales.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
