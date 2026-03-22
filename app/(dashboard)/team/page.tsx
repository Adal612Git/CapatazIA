"use client";

import { useMemo } from "react";
import { ModuleHeader } from "@/components/module-header";
import { KpiCard, StatusPill } from "@/components/ui/surface-primitives";
import { getDomainConfig } from "@/lib/domain-config";
import { canViewUserProfile } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function TeamPage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const allUsers = useAppStore((state) => state.users);
  const tasks = useAppStore((state) => state.tasks);
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const activity = useAppStore((state) => state.activity);
  const prospects = useAppStore((state) => state.prospects);
  const salesOperations = useAppStore((state) => state.salesOperations);
  const runtimeReports = useAppStore((state) => state.runtimeReports);
  const runtimeNotes = useAppStore((state) => state.runtimeNotes);
  const domain = getDomainConfig(systemMode);

  const users = useMemo(
    () =>
      currentUser
        ? allUsers.filter((user) => user.role !== "admin" && user.role !== "owner" && canViewUserProfile(currentUser, user))
        : [],
    [allUsers, currentUser],
  );
  const activeUsers = users.filter((user) => tasks.some((task) => task.assigneeId === user.id && task.columnId !== "done")).length;
  const averageScore = users.length
    ? users.reduce((sum, user) => sum + (scoreSnapshots.find((snapshot) => snapshot.userId === user.id)?.score ?? 0), 0) / users.length
    : 0;
  const activeReports = runtimeReports.filter((report) => users.some((user) => user.id === report.targetUserId)).length;

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow={systemMode === "hospital" ? "Operacion por turno" : "Desempeno por persona"}
        title={systemMode === "hospital" ? "Turnos, carga y supervision" : "Equipo, carga y supervision"}
        description={
          systemMode === "hospital"
            ? "Lectura gerencial del personal con carga, pulso operativo, actividad reciente y contexto generado por Capataz."
            : "Lectura gerencial del equipo con carga, score, actividad reciente y contexto generado por Capataz."
        }
        actions={<span className="report-chip">{systemMode === "hospital" ? "People + shift ops" : "People + performance"}</span>}
      />

      <section className="hero-grid">
        <KpiCard label="Colaboradores" value={users.length} description="Roster visible segun permisos y alcance operativo." />
        <KpiCard label="Activos" value={activeUsers} description="Personas con carga viva y supervision inmediata." />
        <KpiCard label="Score medio" value={averageScore.toFixed(1)} description="Lectura sintetica de disciplina y ritmo del equipo." />
        <KpiCard label="Contexto IA" value={activeReports} description="Reportes personalizados listos para coaching o junta." />
      </section>

      <section className="team-grid">
        {users.map((user) => {
          const userTasks = tasks.filter((task) => task.assigneeId === user.id && task.columnId !== "done");
          const userBlocked = tasks.filter((task) => task.assigneeId === user.id && task.columnId === "blocked");
          const userProspects = prospects.filter((prospect) => prospect.salespersonId === user.id);
          const userOperations = salesOperations.filter((operation) => operation.salespersonId === user.id);
          const userScore = scoreSnapshots.find((snapshot) => snapshot.userId === user.id);
          const userActivity = activity.filter((entry) => entry.actorId === user.id).slice(0, 2);
          const userNotes = runtimeNotes.filter((note) => note.createdByUserId === user.id).slice(0, 1);
          const userReport = runtimeReports.find((report) => report.targetUserId === user.id);

          return (
            <article key={user.id} className="panel team-card">
              <div className="panel-header">
                <div className="team-persona">
                  <div className="avatar" style={{ background: user.accent }}>
                    {user.avatar}
                  </div>
                  <div>
                    <strong>{user.name}</strong>
                    <p>
                      {user.role} | {user.site}
                    </p>
                  </div>
                </div>
                <StatusPill tone={userScore && userScore.score >= 85 ? "success" : userScore && userScore.score < 70 ? "critical" : "info"}>
                  {userScore?.score ?? "--"}
                </StatusPill>
              </div>
              <p>{user.statusLabel}</p>
              <div className="mini-stat-grid">
                <div>
                  <strong>{userTasks.length}</strong>
                  <span>{systemMode === "hospital" ? "Pendientes" : "Abiertas"}</span>
                </div>
                <div>
                  <strong>{userBlocked.length}</strong>
                  <span>Bloqueadas</span>
                </div>
                <div>
                  <strong>{userProspects.filter((prospect) => prospect.status !== "closed_won" && prospect.status !== "closed_lost").length}</strong>
                  <span>{systemMode === "hospital" ? "Ingresos" : "Prospectos"}</span>
                </div>
                <div>
                  <strong>{userOperations.filter((operation) => operation.stage === "ready_to_close").length}</strong>
                  <span>{systemMode === "hospital" ? "Listos" : "Por cerrar"}</span>
                </div>
              </div>

              {userActivity.length ? (
                <div className="stack-sm">
                  {userActivity.map((entry) => (
                    <div key={entry.id} className="detail-card">
                      <strong>Actividad</strong>
                      <p>{entry.message}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {userNotes.length ? (
                <div className="detail-card">
                  <strong>Ultima nota</strong>
                  <p>{userNotes[0].body}</p>
                </div>
              ) : null}

              {userReport ? (
                <div className="detail-card">
                  <strong>{userReport.title}</strong>
                  <p>{userReport.body}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
