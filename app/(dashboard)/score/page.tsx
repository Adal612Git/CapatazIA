"use client";

import { ModuleHeader } from "@/components/module-header";
import { KpiCard, SectionCard, StatusPill } from "@/components/ui/surface-primitives";
import { getDomainConfig } from "@/lib/domain-config";
import { scoreBand } from "@/lib/score";
import { useCurrentUser, useAppStore } from "@/lib/store";

export default function ScorePage() {
  const currentUser = useCurrentUser();
  const systemMode = useAppStore((state) => state.systemMode);
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const users = useAppStore((state) => state.users);
  const runtimeReports = useAppStore((state) => state.runtimeReports);
  const runtimeSuggestions = useAppStore((state) => state.runtimeSuggestions);
  const domain = getDomainConfig(systemMode);
  const visibleSnapshots =
    currentUser?.role === "operator"
      ? scoreSnapshots.filter((snapshot) => snapshot.userId === currentUser.id)
      : scoreSnapshots;
  const averageScore = visibleSnapshots.length
    ? visibleSnapshots.reduce((sum, snapshot) => sum + snapshot.score, 0) / visibleSnapshots.length
    : 0;
  const highBand = visibleSnapshots.filter((snapshot) => snapshot.score >= 85).length;
  const lowBand = visibleSnapshots.filter((snapshot) => snapshot.score < 70).length;

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow={systemMode === "hospital" ? "Pulso operativo" : "Capataz Score"}
        title={systemMode === "hospital" ? "Motor clinico y explicable" : "Motor determinista y explicable"}
        description={
          systemMode === "hospital"
            ? "Ventana de 28 dias, pesos 35/25/25/15 y lectura accionable por persona para sostener continuidad y respuesta."
            : "Ventana de 28 dias, pesos 35/25/25/15 y lectura accionable por persona."
        }
        actions={<span className="report-chip">{systemMode === "hospital" ? "Clinical pulse engine" : "Explainable score engine"}</span>}
      />

      <section className="hero-grid">
        <KpiCard label="Promedio" value={averageScore.toFixed(1)} description="Estado general del equipo dentro de la ventana activa." />
        <KpiCard label="Banda alta" value={highBand} description="Personas con execution premium y consistencia fuerte." />
        <KpiCard label="Banda baja" value={lowBand} description="Casos que requieren coaching, destrabe o seguimiento." />
        <KpiCard label="Narrativa IA" value={runtimeSuggestions.length} description="Sugerencias activas listas para convertir score en accion." />
      </section>

      <section className="score-layout">
        <SectionCard
          eyebrow="Formula oficial"
          title="Score = compliance x 0.35 + speed x 0.25 + consistency x 0.25 + activity x 0.15"
          description={
            systemMode === "hospital"
              ? "El motor visible pondera protocolos, tiempos de respuesta, constancia y actividad operativa."
              : "El motor visible es personal, auditable y no depende de IA negra en este MVP."
          }
        >
          <div className="chip-row">
            <StatusPill tone="success">compliance 35%</StatusPill>
            <StatusPill tone="info">speed 25%</StatusPill>
            <StatusPill tone="warning">consistency 25%</StatusPill>
            <StatusPill>activity 15%</StatusPill>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Bandas" title="Lectura ejecutiva del score">
          <div className="score-bands">
            <StatusPill tone="success">85 - 100 Alto</StatusPill>
            <StatusPill tone="warning">70 - 84 Medio</StatusPill>
            <StatusPill tone="critical">0 - 69 Bajo</StatusPill>
          </div>
          <p className="module-copy">
            Reportes IA: {runtimeReports.length} | Sugerencias activas: {runtimeSuggestions.length}
          </p>
        </SectionCard>
      </section>

      <SectionCard title="Tabla explicable del equipo">
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
                      <StatusPill>{snapshot.score}</StatusPill>
                    </td>
                    <td>
                      <StatusPill tone={snapshot.trend === "up" ? "success" : snapshot.trend === "down" ? "critical" : "info"}>
                        {snapshot.trend === "up" ? "Subiendo" : snapshot.trend === "down" ? "Bajando" : "Estable"}
                      </StatusPill>
                    </td>
                    <td>{scoreBand(snapshot.score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
