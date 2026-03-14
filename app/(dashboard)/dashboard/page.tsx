"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowUpRight, BookText, ClipboardCheck, Gauge, Lightbulb, Zap } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { scoreBand } from "@/lib/score";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { formatDateTime, isOverdue, relativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const currentUser = useCurrentUser();
  const tasks = useAppStore((state) => state.tasks);
  const alerts = useAppStore((state) => state.alerts);
  const weekly = useAppStore((state) => state.weekly);
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const users = useAppStore((state) => state.users);
  const activity = useAppStore((state) => state.activity);
  const runtimeNotes = useAppStore((state) => state.runtimeNotes);
  const runtimeSuggestions = useAppStore((state) => state.runtimeSuggestions);
  const selectTask = useAppStore((state) => state.selectTask);
  const scopedTasks = currentUser?.role === "operator" ? tasks.filter((task) => task.assigneeId === currentUser.id) : tasks;
  const scopedScores =
    currentUser?.role === "operator"
      ? scoreSnapshots.filter((snapshot) => snapshot.userId === currentUser.id)
      : scoreSnapshots;
  const scopedActivity =
    currentUser?.role === "operator"
      ? activity.filter((entry) => entry.actorId === currentUser.id)
      : activity;

  const overdue = scopedTasks.filter((task) => task.columnId !== "done" && isOverdue(task.dueAt)).length;
  const highestScore = [...scopedScores].sort((left, right) => right.score - left.score)[0];
  const topUser = users.find((user) => user.id === highestScore?.userId);
  const priorityTasks = scopedTasks
    .filter((task) => task.priority === "critical" || task.priority === "high")
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt));

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Vision general"
        title="La agencia en un solo golpe de vista."
        description="Pipeline comercial, atencion critica, post-venta y ritmo semanal para decidir sin perseguir reportes manuales."
      />

      <section className="hero-grid">
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Tareas activas</span>
            <ClipboardCheck className="icon-accent" size={18} />
          </div>
          <strong>{scopedTasks.filter((task) => task.columnId !== "done").length}</strong>
          <p>Incluye juntas, seguimientos, incidentes y operaciones bloqueadas.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Alertas vivas</span>
            <AlertTriangle className="icon-accent icon-amber" size={18} />
          </div>
          <strong>{alerts.filter((alert) => !alert.read).length}</strong>
          <p>Campana, post-venta vencida y operaciones atoradas salen primero.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Riesgo por atraso</span>
            <Zap className="icon-accent icon-rose" size={18} />
          </div>
          <strong>{overdue}</strong>
          <p>Lo vencido golpea conversion y recompra; el tablero no finge calma.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Score lider</span>
            <Gauge className="icon-accent icon-violet" size={18} />
          </div>
          <strong>{highestScore?.score}</strong>
          <p>
            {topUser?.name} · banda {highestScore ? scoreBand(highestScore.score) : "n/a"}
          </p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Semanal</p>
              <h3>Ritmo comercial</h3>
            </div>
            <span className="pill pill-muted">Ultimos 7 dias</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="completedFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ff7a1f" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#ff7a1f" stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id="alertsFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffbe5a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ffbe5a" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(237,111,47,0.12)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(120,82,52,0.72)" />
              <YAxis stroke="rgba(120,82,52,0.72)" />
              <Tooltip contentStyle={{ background: "#fff7f1", border: "1px solid rgba(237,111,47,0.16)" }} />
              <Area dataKey="completed" stroke="#ff7a1f" fill="url(#completedFill)" strokeWidth={2.5} />
              <Area dataKey="alerts" stroke="#ffbe5a" fill="url(#alertsFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Prioridad inmediata</p>
              <h3>Lo que requiere accion hoy</h3>
            </div>
            <ArrowUpRight className="icon-accent" size={18} />
          </div>
          <div className="stack-sm">
            {priorityTasks.map((task) => (
              <button key={task.id} className="priority-row" type="button" onClick={() => selectTask(task.id)}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.location}</p>
                </div>
                <div>
                  <span className={`pill priority-${task.priority}`}>{task.priority}</span>
                  <small>{formatDateTime(task.dueAt)}</small>
                </div>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="panel stack-md">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Actividad reciente</p>
            <h3>Ultimos movimientos de agencia</h3>
          </div>
        </div>
        <div className="stack-sm">
          {scopedActivity.slice(0, 5).map((entry) => {
            const actor = users.find((user) => user.id === entry.actorId);
            return (
              <div key={entry.id} className="report-row">
                <div>
                  <strong>{actor?.name ?? "Sistema"}</strong>
                  <p>{entry.message}</p>
                </div>
                <small>{relativeTime(entry.createdAt)}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack-sm">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Proactividad IA</p>
              <h3>Sugerencias del Capataz</h3>
            </div>
            <Lightbulb className="icon-accent icon-amber" size={18} />
          </div>
          {runtimeSuggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.id} className="detail-card">
              <strong>{suggestion.title}</strong>
              <p>{suggestion.body}</p>
            </div>
          ))}
          {!runtimeSuggestions.length ? <p className="module-copy">Todavia no hay sugerencias guardadas por la IA.</p> : null}
        </article>

        <article className="panel stack-sm">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Memoria operativa</p>
              <h3>Ultimas notas</h3>
            </div>
            <BookText className="icon-accent" size={18} />
          </div>
          {runtimeNotes.slice(0, 3).map((note) => {
            const actor = users.find((user) => user.id === note.createdByUserId);
            return (
              <div key={note.id} className="detail-card">
                <strong>{note.title}</strong>
                <p>{note.body}</p>
                <small>{actor?.name ?? "Sistema"}</small>
              </div>
            );
          })}
          {!runtimeNotes.length ? <p className="module-copy">Todavia no hay memoria operativa registrada.</p> : null}
        </article>
      </section>
    </div>
  );
}
