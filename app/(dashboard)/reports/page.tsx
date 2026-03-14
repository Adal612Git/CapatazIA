"use client";

import { Download, FileBarChart2 } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { canViewCreditFile, canViewSalesOperation } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { downloadText } from "@/lib/utils";

export default function ReportsPage() {
  const currentUser = useCurrentUser();
  const tasks = useAppStore((state) => state.tasks);
  const alerts = useAppStore((state) => state.alerts);
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const salesOperations = useAppStore((state) => state.salesOperations);
  const creditFiles = useAppStore((state) => state.creditFiles);
  const runtimeReports = useAppStore((state) => state.runtimeReports);
  const runtimeNotes = useAppStore((state) => state.runtimeNotes);
  const runtimeSuggestions = useAppStore((state) => state.runtimeSuggestions);
  const visibleOperations = currentUser ? salesOperations.filter((operation) => canViewSalesOperation(currentUser, operation)) : [];
  const visibleCreditFiles = currentUser ? creditFiles.filter((creditFile) => canViewCreditFile(currentUser, creditFile)) : [];

  const averageScore = scoreSnapshots.length
    ? scoreSnapshots.reduce((sum, snapshot) => sum + snapshot.score, 0) / scoreSnapshots.length
    : 0;
  const latestReport = runtimeReports[0];

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Analitica operativa"
        title="Reportes listos para exportar"
        description="Resumen ejecutivo, archivo IA y memoria operativa en una sola superficie."
        actions={
          <button
            className="button-primary"
            type="button"
            onClick={() =>
              downloadText(
                "capataz-reporte-operativo.txt",
                [
                  "CAPATAZ AI | CORTE OPERATIVO",
                  `Tareas abiertas: ${tasks.filter((task) => task.columnId !== "done").length}`,
                  `Tareas completadas: ${tasks.filter((task) => task.columnId === "done").length}`,
                  `Alertas no leidas: ${alerts.filter((alert) => !alert.read).length}`,
                  `Operaciones vivas: ${visibleOperations.filter((operation) => operation.stage !== "closed_won" && operation.stage !== "closed_lost").length}`,
                  `Expedientes incompletos: ${visibleCreditFiles.filter((creditFile) => creditFile.status === "missing_documents").length}`,
                  `Score promedio: ${averageScore.toFixed(1)}`,
                  latestReport ? `Ultimo reporte IA: ${latestReport.title}` : "Ultimo reporte IA: no disponible",
                  latestReport?.body ?? "",
                ].join("\n"),
              )
            }
          >
            <Download size={16} />
            Exportar corte
          </button>
        }
      />

      <section className="hero-grid">
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Cierre operativo</span>
            <FileBarChart2 className="icon-accent" size={18} />
          </div>
          <strong>{tasks.filter((task) => task.columnId === "done").length}</strong>
          <p>Tareas cerradas y listas para evidencia.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Pendiente estructural</span>
          </div>
          <strong>{tasks.filter((task) => task.columnId === "blocked").length}</strong>
          <p>Bloqueos que deben resolverse antes del siguiente corte.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Reportes IA</span>
          </div>
          <strong>{runtimeReports.length}</strong>
          <p>Historial generado por Capataz desde WhatsApp y dashboard.</p>
        </article>
        <article className="metric-card panel">
          <div className="metric-top">
            <span className="metric-label">Expedientes trabados</span>
          </div>
          <strong>{visibleCreditFiles.filter((creditFile) => creditFile.status === "missing_documents").length}</strong>
          <p>Documentos que todavia frenan cierres reales.</p>
        </article>
      </section>

      <section className="panel stack-md">
        <div className="report-row">
          <strong>Estado general</strong>
          <p>El negocio tiene carga viva, pero la visibilidad ya mezcla operacion e inteligencia operativa.</p>
        </div>
        <div className="report-row">
          <strong>Score promedio</strong>
          <p>{averageScore.toFixed(1)}</p>
        </div>
        <div className="report-row">
          <strong>Alertas abiertas</strong>
          <p>{alerts.filter((alert) => !alert.read).length}</p>
        </div>
        <div className="report-row">
          <strong>Operaciones listas para cierre</strong>
          <p>{visibleOperations.filter((operation) => operation.stage === "ready_to_close").length}</p>
        </div>
        <div className="report-row">
          <strong>Memoria viva</strong>
          <p>{runtimeNotes.length}</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack-sm">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Archivo IA</p>
              <h3>Ultimos reportes</h3>
            </div>
          </div>
          {runtimeReports.slice(0, 5).map((report) => (
            <div key={report.id} className="detail-card">
              <strong>{report.title}</strong>
              <p className="whatsapp-report">{report.body}</p>
              <small>{report.kind}</small>
            </div>
          ))}
          {!runtimeReports.length ? <p className="module-copy">Todavia no hay reportes generados por la IA.</p> : null}
        </article>

        <article className="panel stack-sm">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Contexto IA</p>
              <h3>Memoria y sugerencias</h3>
            </div>
          </div>
          {runtimeNotes.slice(0, 3).map((note) => (
            <div key={note.id} className="detail-card">
              <strong>{note.title}</strong>
              <p>{note.body}</p>
            </div>
          ))}
          {runtimeSuggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.id} className="detail-card">
              <strong>{suggestion.title}</strong>
              <p>{suggestion.body}</p>
            </div>
          ))}
          {!runtimeNotes.length && !runtimeSuggestions.length ? (
            <p className="module-copy">Todavia no hay contexto adicional guardado por Capataz.</p>
          ) : null}
        </article>
      </section>
    </div>
  );
}
