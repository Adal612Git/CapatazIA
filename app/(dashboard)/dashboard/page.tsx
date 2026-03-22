"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowUpRight, BookText, ClipboardCheck, Gauge, Lightbulb, Zap } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { DemoStepStrip, EmptyState } from "@/components/ui/runtime-states";
import { KpiCard, SectionCard, StatusPill } from "@/components/ui/surface-primitives";
import { formatFinanceMoney, getUserFinanceAccounts, getUserFinanceApplications } from "@/lib/fintech";
import { getDomainConfig } from "@/lib/domain-config";
import { scoreBand } from "@/lib/score";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { formatDateTime, isOverdue, relativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const tasks = useAppStore((state) => state.tasks);
  const alerts = useAppStore((state) => state.alerts);
  const weekly = useAppStore((state) => state.weekly);
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const users = useAppStore((state) => state.users);
  const activity = useAppStore((state) => state.activity);
  const runtimeNotes = useAppStore((state) => state.runtimeNotes);
  const runtimeSuggestions = useAppStore((state) => state.runtimeSuggestions);
  const financeAccounts = useAppStore((state) => state.financeAccounts);
  const financeApplications = useAppStore((state) => state.financeApplications);
  const selectTask = useAppStore((state) => state.selectTask);
  const domain = getDomainConfig(systemMode);
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
  const currentFinanceAccounts = currentUser ? getUserFinanceAccounts(currentUser.id, financeAccounts) : [];
  const currentFinanceApplications = currentUser ? getUserFinanceApplications(currentUser.id, financeApplications) : [];
  const priorityTasks = scopedTasks
    .filter((task) => task.priority === "critical" || task.priority === "high")
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  const demoFlow = [
    { label: "1. Dashboard", detail: "KPIs, alertas y foco critico en una sola lectura.", tone: "success" as const },
    { label: "2. Crear tarea", detail: "Supervision dispara una tarea nueva con checklist obligatorio." },
    { label: "3. Kanban", detail: "El equipo mueve ejecucion real; si falta checklist, no cierra.", tone: "critical" as const },
    { label: "4. Score", detail: "La disciplina pega al score sin decision arbitraria." },
    { label: "5. Reporte", detail: "La junta sale con narrativa ejecutiva y exportable.", tone: "success" as const },
  ];

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Vision general"
        title={domain.dashboardTitle}
        description={domain.dashboardDescription}
        actions={<span className="report-chip">{systemMode === "hospital" ? "Care command center" : "Auto command center"}</span>}
      />

      <section className="hero-grid">
        <KpiCard
          label="Tareas activas"
          value={scopedTasks.filter((task) => task.columnId !== "done").length}
          description="Incluye juntas, seguimientos, incidentes y operaciones bloqueadas."
          icon={<ClipboardCheck className="icon-accent" size={18} />}
        />
        <KpiCard
          label="Alertas vivas"
          value={alerts.filter((alert) => !alert.read).length}
          description={`${domain.incidentPlural}, ${domain.followUpPlural} y ${domain.operationPlural} atoradas salen primero.`}
          icon={<AlertTriangle className="icon-accent icon-amber" size={18} />}
        />
        <KpiCard
          label="Riesgo por atraso"
          value={overdue}
          description="Lo vencido golpea ritmo operativo; el tablero no finge calma."
          icon={<Zap className="icon-accent icon-rose" size={18} />}
        />
        <KpiCard
          label="Score lider"
          value={highestScore?.score ?? "--"}
          description={`${topUser?.name ?? "Sin lider visible"} · banda ${highestScore ? scoreBand(highestScore.score) : "n/a"}`}
          icon={<Gauge className="icon-accent icon-violet" size={18} />}
        />
      </section>

      <DemoStepStrip items={demoFlow} />

      <section className="dashboard-grid">
        <SectionCard eyebrow="Semanal" title="Ritmo operativo" actions={<StatusPill>Ultimos 7 dias</StatusPill>} className="chart-panel">
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
        </SectionCard>

        <SectionCard eyebrow="Prioridad inmediata" title="Lo que requiere accion hoy" icon={<ArrowUpRight className="icon-accent" size={18} />}>
          {priorityTasks.length ? (
            <div className="stack-sm">
              {priorityTasks.map((task) => (
                <button key={task.id} className="priority-row" type="button" onClick={() => selectTask(task.id)}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.location}</p>
                  </div>
                  <div>
                    <StatusPill tone={task.priority === "critical" ? "critical" : "warning"}>{task.priority}</StatusPill>
                    <small>{formatDateTime(task.dueAt)}</small>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No hay tareas criticas visibles"
              body="La lectura actual esta limpia. Puedes crear una tarea nueva para demostrar ejecucion completa."
            />
          )}
        </SectionCard>
      </section>

      <SectionCard eyebrow="Actividad reciente" title={`Ultimos movimientos de ${domain.primaryUnitLabel}`} className="stack-md">
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
      </SectionCard>

      <section className="dashboard-grid">
        <SectionCard eyebrow="Capataz Capital" title="Fintech sobre el mismo score">
          <div className="detail-card">
            <strong>{formatFinanceMoney(currentFinanceAccounts.reduce((sum, account) => sum + account.availableBalance, 0))}</strong>
            <p>
              Saldo disponible para {currentUser?.name ?? "el colaborador"} con {currentFinanceApplications.length} solicitudes registradas en el runtime central.
            </p>
          </div>
          <p className="module-copy">La app movil, el dashboard y WhatsApp leen la misma capa financiera para la demo completa.</p>
        </SectionCard>

        <SectionCard eyebrow="Proactividad IA" title="Sugerencias del Capataz" icon={<Lightbulb className="icon-accent icon-amber" size={18} />}>
          {runtimeSuggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.id} className="detail-card">
              <strong>{suggestion.title}</strong>
              <p>{suggestion.body}</p>
            </div>
          ))}
          {!runtimeSuggestions.length ? <p className="module-copy">Todavia no hay sugerencias guardadas por la IA.</p> : null}
        </SectionCard>

        <SectionCard eyebrow="Memoria operativa" title="Ultimas notas" icon={<BookText className="icon-accent" size={18} />}>
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
        </SectionCard>
      </section>
    </div>
  );
}
