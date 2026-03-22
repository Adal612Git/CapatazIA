"use client";

import { useState } from "react";
import { CalendarDays, ListFilter, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ModuleHeader } from "@/components/module-header";
import { EmptyState } from "@/components/ui/runtime-states";
import { getDomainConfig } from "@/lib/domain-config";
import { canMoveTask } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { cn, formatDateTime } from "@/lib/utils";

export default function TasksPage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const users = useAppStore((state) => state.users);
  const tasks = useAppStore((state) => state.tasks);
  const moveTask = useAppStore((state) => state.moveTask);
  const selectTask = useAppStore((state) => state.selectTask);
  const domain = getDomainConfig(systemMode);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [dueDate, setDueDate] = useState("");
  const openTasks = tasks.filter((task) => task.columnId !== "done");
  const blockedTasks = tasks.filter((task) => task.columnId === "blocked");

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
        title={systemMode === "hospital" ? "Lista ejecutiva de pendientes clinicos" : "Lista ejecutiva de tareas"}
        description={
          systemMode === "hospital"
            ? "Huddles, ingresos, autorizaciones, incidentes y continuidad de alta con visibilidad completa."
            : "Junta diaria, seguimientos, pruebas de manejo, campana y post-venta con visibilidad completa."
        }
      />

      <section className="hero-grid">
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Total visible</span>
          </div>
          <strong>{visibleTasks.length}</strong>
          <p>Tareas despues de aplicar filtros, scope y busqueda.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Abiertas</span>
          </div>
          <strong>{openTasks.length}</strong>
          <p>Trabajo operativo que aun requiere movimiento real.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Bloqueadas</span>
          </div>
          <strong>{blockedTasks.length}</strong>
          <p>Casos atorados que exigen destrabe gerencial.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Tabla ejecutiva</span>
          </div>
          <strong>{domain.primaryUnitLabel}</strong>
          <p>Prioridad, responsable, vencimiento y accion en una sola lectura.</p>
        </article>
      </section>

      <section className="filter-bar panel">
        <label className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={systemMode === "hospital" ? "Buscar pendiente, paciente, hospital o contexto" : "Buscar tarea, cliente, agencia o contexto"}
          />
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
                              {systemMode === "hospital" ? "Atender" : "Tomar"}
                            </button>
                            <button
                              className="button-primary"
                              type="button"
                              onClick={() => currentUser && moveTask(task.id, "done", currentUser.id)}
                            >
                              {systemMode === "hospital" ? "Resolver" : "Cerrar"}
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
                    <EmptyState
                      title="No hay tareas que coincidan"
                      body="Ajusta filtros o crea una nueva tarea para sostener el flujo demo completo."
                    />
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
