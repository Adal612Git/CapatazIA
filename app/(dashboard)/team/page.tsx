"use client";

import { useMemo } from "react";
import { ModuleHeader } from "@/components/module-header";
import { canViewUserProfile } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function TeamPage() {
  const currentUser = useCurrentUser();
  const allUsers = useAppStore((state) => state.users);
  const tasks = useAppStore((state) => state.tasks);
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const activity = useAppStore((state) => state.activity);
  const prospects = useAppStore((state) => state.prospects);
  const salesOperations = useAppStore((state) => state.salesOperations);
  const runtimeReports = useAppStore((state) => state.runtimeReports);
  const runtimeNotes = useAppStore((state) => state.runtimeNotes);

  const users = useMemo(
    () =>
      currentUser
        ? allUsers.filter((user) => user.role !== "admin" && user.role !== "owner" && canViewUserProfile(currentUser, user))
        : [],
    [allUsers, currentUser],
  );

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Desempeno por persona"
        title="Equipo, carga y supervision"
        description="Lectura gerencial del equipo con carga, score, actividad reciente y contexto generado por Capataz."
      />

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
                <span className="pill pill-muted">{userScore?.score ?? "--"}</span>
              </div>
              <p>{user.statusLabel}</p>
              <div className="mini-stat-grid">
                <div>
                  <strong>{userTasks.length}</strong>
                  <span>Abiertas</span>
                </div>
                <div>
                  <strong>{userBlocked.length}</strong>
                  <span>Bloqueadas</span>
                </div>
                <div>
                  <strong>{userProspects.filter((prospect) => prospect.status !== "closed_won" && prospect.status !== "closed_lost").length}</strong>
                  <span>Prospectos</span>
                </div>
                <div>
                  <strong>{userOperations.filter((operation) => operation.stage === "ready_to_close").length}</strong>
                  <span>Por cerrar</span>
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
