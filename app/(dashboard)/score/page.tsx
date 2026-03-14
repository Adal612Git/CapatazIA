"use client";

import { ModuleHeader } from "@/components/module-header";
import { scoreBand } from "@/lib/score";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function ScorePage() {
  const currentUser = useCurrentUser();
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const users = useAppStore((state) => state.users);
  const runtimeReports = useAppStore((state) => state.runtimeReports);
  const runtimeSuggestions = useAppStore((state) => state.runtimeSuggestions);
  const visibleSnapshots =
    currentUser?.role === "operator"
      ? scoreSnapshots.filter((snapshot) => snapshot.userId === currentUser.id)
      : scoreSnapshots;

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Capataz Score"
        title="Motor determinista y explicable"
        description="Ventana de 28 dias, pesos 35/25/25/15 y lectura accionable por persona."
      />

      <section className="score-layout">
        <article className="panel">
          <div className="score-formula">
            <p className="eyebrow">Formula oficial</p>
            <h3>Score = compliance x 0.35 + speed x 0.25 + consistency x 0.25 + activity x 0.15</h3>
            <p>El motor visible es personal, auditable y no depende de IA negra en este MVP.</p>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Bandas</p>
          <div className="score-bands">
            <span className="pill score-high">85 - 100 Alto</span>
            <span className="pill score-medium">70 - 84 Medio</span>
            <span className="pill score-low">0 - 69 Bajo</span>
          </div>
          <p className="module-copy">
            Reportes IA: {runtimeReports.length} | Sugerencias activas: {runtimeSuggestions.length}
          </p>
        </article>
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Compliance</th>
                <th>Speed</th>
                <th>Consistency</th>
                <th>Activity</th>
                <th>Score</th>
                <th>Trend</th>
                <th>Lectura</th>
              </tr>
            </thead>
            <tbody>
              {visibleSnapshots.map((snapshot) => {
                const user = users.find((entry) => entry.id === snapshot.userId);
                return (
                  <tr key={snapshot.userId}>
                    <td>
                      {user?.name}
                      <small>{snapshot.note}</small>
                    </td>
                    <td>{snapshot.compliance}</td>
                    <td>{snapshot.speed}</td>
                    <td>{snapshot.consistency}</td>
                    <td>{snapshot.activity}</td>
                    <td>
                      <span className="pill pill-muted">{snapshot.score}</span>
                    </td>
                    <td>
                      <span className="pill pill-muted">
                        {snapshot.trend === "up" ? "Subiendo" : snapshot.trend === "down" ? "Bajando" : "Estable"}
                      </span>
                    </td>
                    <td>{scoreBand(snapshot.score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
