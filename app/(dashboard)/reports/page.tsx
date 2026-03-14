"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Bot, Download, FileSpreadsheet, Gauge, Target, TrendingUp, Wallet } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import {
  buildAgencyMetrics,
  collectAgencyNames,
  creditStatusLabels,
  formatMoney,
  prospectStatusLabels,
  salesStageLabels,
} from "@/lib/automotive";
import {
  canViewBellIncident,
  canViewCreditFile,
  canViewPostSaleFollowUp,
  canViewProspect,
  canViewSalesOperation,
  canViewTask,
  canViewTestDrive,
  canViewUserProfile,
} from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { downloadSpreadsheetXml } from "@/lib/utils";

const chartPalette = ["#f07a2b", "#ffab49", "#ffcc69", "#5cc8ff", "#6a8cff", "#7dd3a7"];

const stageWeights: Record<string, number> = {
  prospecting: 0.2,
  test_drive: 0.38,
  negotiation: 0.58,
  credit_review: 0.72,
  ready_to_close: 0.92,
  closed_won: 1,
  closed_lost: 0,
};

function estimateVehicleValue(vehicleModel: string) {
  const normalized = vehicleModel.toLowerCase();

  if (normalized.includes("tiguan")) return 692_000;
  if (normalized.includes("taos")) return 538_000;
  if (normalized.includes("jetta")) return 469_000;
  if (normalized.includes("virtus")) return 398_000;
  if (normalized.includes("nivus")) return 445_000;
  if (normalized.includes("t-cross")) return 488_000;
  if (normalized.includes("polo")) return 348_000;
  if (normalized.includes("amarok")) return 755_000;

  return 432_000;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildForecastData(readyToClose: number, activeOperations: number, missingCreditFiles: number, openIncidents: number) {
  const closableBase = readyToClose + Math.round(activeOperations * 0.35);
  const friction = missingCreditFiles + openIncidents;

  return [
    { week: "Semana 1", projected: Math.max(closableBase, 1), conservative: Math.max(closableBase - Math.ceil(friction * 0.35), 0) },
    { week: "Semana 2", projected: Math.max(Math.round(closableBase * 1.08), 1), conservative: Math.max(Math.round((closableBase - friction * 0.2) * 1.04), 0) },
    { week: "Semana 3", projected: Math.max(Math.round(closableBase * 1.15), 1), conservative: Math.max(Math.round((closableBase - friction * 0.12) * 1.08), 0) },
    { week: "Semana 4", projected: Math.max(Math.round(closableBase * 1.2), 1), conservative: Math.max(Math.round((closableBase - friction * 0.1) * 1.12), 0) },
  ];
}

function KpiCard({
  label,
  value,
  detail,
  signal,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  signal: string;
  icon: ReactNode;
}) {
  return (
    <article className="metric-card panel report-kpi-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="report-kpi-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
      <span className="report-chip">{signal}</span>
    </article>
  );
}

export default function ReportsPage() {
  const [referenceNow] = useState(() => Date.now());
  const currentUser = useCurrentUser();
  const users = useAppStore((state) => state.users);
  const tasks = useAppStore((state) => state.tasks);
  const alerts = useAppStore((state) => state.alerts);
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const weekly = useAppStore((state) => state.weekly);
  const prospects = useAppStore((state) => state.prospects);
  const testDrives = useAppStore((state) => state.testDrives);
  const salesOperations = useAppStore((state) => state.salesOperations);
  const creditFiles = useAppStore((state) => state.creditFiles);
  const bellIncidents = useAppStore((state) => state.bellIncidents);
  const postSaleFollowUps = useAppStore((state) => state.postSaleFollowUps);
  const runtimeReports = useAppStore((state) => state.runtimeReports);
  const runtimeNotes = useAppStore((state) => state.runtimeNotes);
  const runtimeSuggestions = useAppStore((state) => state.runtimeSuggestions);

  const visibleData = useMemo(() => {
    if (!currentUser) {
      return {
        visibleUsers: [],
        visibleTasks: [],
        visibleScores: [],
        visibleProspects: [],
        visibleTestDrives: [],
        visibleOperations: [],
        visibleCreditFiles: [],
        visibleBellIncidents: [],
        visiblePostSaleFollowUps: [],
      };
    }

    const visibleUsers = users.filter((user) => canViewUserProfile(currentUser, user));

    return {
      visibleUsers,
      visibleTasks: tasks.filter((task) => canViewTask(currentUser, task, users)),
      visibleScores: scoreSnapshots.filter((snapshot) => visibleUsers.some((user) => user.id === snapshot.userId)),
      visibleProspects: prospects.filter((prospect) => canViewProspect(currentUser, prospect)),
      visibleTestDrives: testDrives.filter((testDrive) => canViewTestDrive(currentUser, testDrive)),
      visibleOperations: salesOperations.filter((operation) => canViewSalesOperation(currentUser, operation)),
      visibleCreditFiles: creditFiles.filter((creditFile) => canViewCreditFile(currentUser, creditFile)),
      visibleBellIncidents: bellIncidents.filter((incident) => canViewBellIncident(currentUser, incident)),
      visiblePostSaleFollowUps: postSaleFollowUps.filter((followUp) => canViewPostSaleFollowUp(currentUser, followUp)),
    };
  }, [bellIncidents, creditFiles, currentUser, postSaleFollowUps, prospects, salesOperations, scoreSnapshots, tasks, testDrives, users]);

  const { visibleUsers, visibleTasks, visibleScores, visibleProspects, visibleTestDrives, visibleOperations, visibleCreditFiles, visibleBellIncidents, visiblePostSaleFollowUps } = visibleData;
  const salesUsers = visibleUsers.filter((user) => user.department === "sales");
  const completedTasks = visibleTasks.filter((task) => task.columnId === "done").length;
  const blockedTasks = visibleTasks.filter((task) => task.columnId === "blocked").length;
  const openAlerts = alerts.filter((alert) => !alert.read).length;
  const wonOperations = visibleOperations.filter((operation) => operation.stage === "closed_won").length;
  const activeOperations = visibleOperations.filter((operation) => operation.stage !== "closed_won" && operation.stage !== "closed_lost").length;
  const readyToClose = visibleOperations.filter((operation) => operation.stage === "ready_to_close").length;
  const missingCreditFiles = visibleCreditFiles.filter((creditFile) => creditFile.status === "missing_documents").length;
  const approvedCreditFiles = visibleCreditFiles.filter((creditFile) => creditFile.status === "approved").length;
  const decidedCreditFiles = visibleCreditFiles.filter((creditFile) => creditFile.status === "approved" || creditFile.status === "rejected").length;
  const completedTestDrives = visibleTestDrives.filter((testDrive) => testDrive.status === "completed").length;
  const openIncidents = visibleBellIncidents.filter((incident) => incident.status !== "resolved").length;
  const atRiskFollowUps = visiblePostSaleFollowUps.filter((followUp) => followUp.status === "at_risk").length;
  const overdueFollowUps = visiblePostSaleFollowUps.filter((followUp) => followUp.status !== "closed" && new Date(followUp.dueAt).getTime() < referenceNow).length;
  const averageScore = visibleScores.length ? visibleScores.reduce((sum, snapshot) => sum + snapshot.score, 0) / visibleScores.length : 0;
  const conversionRate = visibleProspects.length ? (wonOperations / visibleProspects.length) * 100 : 0;
  const testDriveRate = visibleProspects.length ? (completedTestDrives / visibleProspects.length) * 100 : 0;
  const creditApprovalRate = decidedCreditFiles ? (approvedCreditFiles / decidedCreditFiles) * 100 : 0;
  const projectedPipelineValue = visibleOperations.reduce((sum, operation) => sum + estimateVehicleValue(operation.vehicleModel) * (stageWeights[operation.stage] ?? operation.closingProbability / 100), 0);
  const subsidyCommitted = visibleOperations.reduce((sum, operation) => sum + operation.subsidyAmount, 0);
  const estimatedRetentionScore = clamp(64 + visiblePostSaleFollowUps.filter((followUp) => followUp.status === "closed").length * 4.5 + visiblePostSaleFollowUps.filter((followUp) => followUp.status === "contacted").length * 2.1 - atRiskFollowUps * 4.8, 48, 98);
  const salesGoal = Math.max(salesUsers.length * 7, 12);
  const goalAttainment = clamp((wonOperations / salesGoal) * 100, 0, 160);
  const latestReport = runtimeReports[0];

  const funnelData = [
    { stage: "Prospectos", value: visibleProspects.length, fill: chartPalette[0] },
    { stage: "Pruebas", value: visibleProspects.filter((prospect) => prospect.status === "test_drive").length + completedTestDrives, fill: chartPalette[1] },
    { stage: "Negociacion", value: visibleProspects.filter((prospect) => prospect.status === "negotiation").length + visibleOperations.filter((operation) => operation.stage === "negotiation").length, fill: chartPalette[2] },
    { stage: "Credito", value: visibleOperations.filter((operation) => operation.stage === "credit_review").length, fill: chartPalette[3] },
    { stage: "Cierre", value: readyToClose, fill: chartPalette[4] },
    { stage: "Ganadas", value: wonOperations, fill: chartPalette[5] },
  ];

  const pipelineStageData = Object.entries(salesStageLabels).map(([stage, label], index) => ({
    stage: label,
    count: visibleOperations.filter((operation) => operation.stage === stage).length,
    projected: Math.round(visibleOperations.filter((operation) => operation.stage === stage).reduce((sum, operation) => sum + estimateVehicleValue(operation.vehicleModel) * (operation.closingProbability / 100), 0) / 1000),
    fill: chartPalette[index % chartPalette.length],
  }));

  const creditMixData = Object.entries(creditStatusLabels).map(([status, label]) => ({ name: label, value: visibleCreditFiles.filter((creditFile) => creditFile.status === status).length })).filter((entry) => entry.value > 0);
  const agencyMetrics = buildAgencyMetrics({
    agencies: collectAgencyNames({
      users: visibleUsers,
      prospects: visibleProspects,
      testDrives: visibleTestDrives,
      salesOperations: visibleOperations,
      creditFiles: visibleCreditFiles,
      incidents: visibleBellIncidents,
      followUps: visiblePostSaleFollowUps,
    }),
    prospects: visibleProspects,
    testDrives: visibleTestDrives,
    salesOperations: visibleOperations,
    creditFiles: visibleCreditFiles,
    incidents: visibleBellIncidents,
    followUps: visiblePostSaleFollowUps,
  });

  const advisorData = salesUsers
    .map((user) => {
      const advisorProspects = visibleProspects.filter((prospect) => prospect.salespersonId === user.id).length;
      const advisorDrives = visibleTestDrives.filter((testDrive) => testDrive.salespersonId === user.id && testDrive.status === "completed").length;
      const advisorWins = visibleOperations.filter((operation) => operation.salespersonId === user.id && operation.stage === "closed_won").length;
      const advisorScore = visibleScores.find((snapshot) => snapshot.userId === user.id)?.score ?? 0;

      return { advisor: user.name.split(" ")[0], prospectos: advisorProspects, pruebas: advisorDrives, cierres: advisorWins, score: advisorScore };
    })
    .sort((left, right) => right.score - left.score || right.cierres - left.cierres)
    .slice(0, 6);

  const weeklyTrendData = weekly.map((point, index) => ({
    ...point,
    pulse: clamp(62 + point.completed * 3.8 - point.alerts * 2.2 - point.overdue * 1.6 + (index % 2 === 0 ? 4 : -1), 40, 99),
  }));

  const forecastData = buildForecastData(readyToClose, activeOperations, missingCreditFiles, openIncidents);
  const reportHighlights = [
    { title: "Pipeline valorizado", body: `${formatMoney(projectedPipelineValue)} en valor ponderado por etapa y probabilidad.`, accent: "Corte comercial" },
    { title: "Foco inmediato", body: `${missingCreditFiles} expedientes y ${openIncidents} incidentes de campana siguen frenando cierre.`, accent: "Bloqueos" },
    { title: "Retencion post-venta", body: `Indice demo estimado en ${formatPercent(estimatedRetentionScore)} con ${atRiskFollowUps} seguimientos en riesgo.`, accent: "Post-venta" },
    { title: "Cobertura del mes", body: `${formatPercent(goalAttainment)} de avance contra meta de ${salesGoal} operaciones cerradas.`, accent: "Meta mensual" },
  ];

  const executiveSignals = [
    blockedTasks ? { title: "Destrabar valuaciones y creditos", body: `${blockedTasks} tareas bloqueadas requieren resolución antes del siguiente corte.` } : null,
    readyToClose ? { title: "Empujar cierre de oportunidad caliente", body: `${readyToClose} operaciones ya están listas para firma y entrega.` } : null,
    overdueFollowUps ? { title: "Recuperar post-venta vencida", body: `${overdueFollowUps} seguimientos ya se vencieron y pueden empujar fuga a otra agencia.` } : null,
    latestReport ? { title: "Capataz ya generó corte IA", body: latestReport.title } : null,
  ].filter(Boolean) as Array<{ title: string; body: string }>;

  function exportWorkbook() {
    downloadSpreadsheetXml("capataz-reporte-ejecutivo.xls", "Capataz AI | Reporte ejecutivo", [
      {
        name: "Resumen",
        rows: [
          [{ value: "Capataz AI | Corte ejecutivo automotriz", styleId: "title" }],
          [{ value: `Generado por ${currentUser?.name ?? "Capataz AI"}`, styleId: "subtle" }],
          [],
          [{ value: "Indicador", styleId: "header" }, { value: "Valor", styleId: "header" }, { value: "Lectura", styleId: "header" }],
          [{ value: "Pipeline valorizado", styleId: "label" }, { value: projectedPipelineValue, styleId: "currency" }, "Valor ponderado del pipeline vivo"],
          [{ value: "Conversion", styleId: "label" }, { value: conversionRate / 100, styleId: "percent" }, "Prospectos convertidos a venta"],
          [{ value: "Pruebas de manejo", styleId: "label" }, { value: testDriveRate / 100, styleId: "percent" }, "Prospectos que si probaron unidad"],
          [{ value: "Aprobacion crediticia", styleId: "label" }, { value: creditApprovalRate / 100, styleId: "percent" }, "Expedientes resueltos favorablemente"],
          [{ value: "Retencion estimada demo", styleId: "label" }, { value: estimatedRetentionScore / 100, styleId: "percent" }, "Indice sintetico de permanencia de clientes"],
          [{ value: "Subsidio comprometido", styleId: "label" }, { value: subsidyCommitted, styleId: "currency" }, "Apoyos comerciales visibles"],
          [],
          [{ value: "Alertas ejecutivas", styleId: "header" }, { value: "Detalle", styleId: "header" }, { value: "Prioridad", styleId: "header" }],
          ...reportHighlights.map((highlight) => [highlight.title, { value: highlight.body, styleId: "wrap" }, highlight.accent]),
        ],
      },
      {
        name: "Pipeline",
        rows: [
          [{ value: "Pipeline comercial", styleId: "title" }],
          [],
          [{ value: "Operacion", styleId: "header" }, { value: "Cliente", styleId: "header" }, { value: "Agencia", styleId: "header" }, { value: "Vehiculo", styleId: "header" }, { value: "Etapa", styleId: "header" }, { value: "Probabilidad", styleId: "header" }, { value: "Valor estimado", styleId: "header" }, { value: "Siguiente paso", styleId: "header" }],
          ...visibleOperations.map((operation) => [operation.id, operation.customerName, operation.agency, operation.vehicleModel, salesStageLabels[operation.stage], { value: operation.closingProbability / 100, styleId: "percent" }, { value: estimateVehicleValue(operation.vehicleModel), styleId: "currency" }, { value: operation.nextStep, styleId: "wrap" }]),
        ],
      },
      {
        name: "Expedientes",
        rows: [
          [{ value: "Estado crediticio", styleId: "title" }],
          [],
          [{ value: "Expediente", styleId: "header" }, { value: "Cliente", styleId: "header" }, { value: "Agencia", styleId: "header" }, { value: "Financiera", styleId: "header" }, { value: "Estado", styleId: "header" }, { value: "Recibidos", styleId: "header" }, { value: "Faltantes", styleId: "header" }],
          ...visibleCreditFiles.map((creditFile) => [creditFile.id, creditFile.customerName, creditFile.agency, creditFile.financier, creditStatusLabels[creditFile.status], creditFile.receivedDocuments.length, { value: creditFile.missingDocuments.join(", "), styleId: "wrap" }]),
        ],
      },
      {
        name: "IA y memoria",
        rows: [
          [{ value: "Archivo IA", styleId: "title" }],
          [],
          [{ value: "Tipo", styleId: "header" }, { value: "Titulo", styleId: "header" }, { value: "Contenido", styleId: "header" }],
          ...runtimeReports.slice(0, 8).map((report) => [report.kind, report.title, { value: report.body, styleId: "wrap" }]),
          ...runtimeSuggestions.slice(0, 6).map((suggestion) => ["sugerencia", suggestion.title, { value: suggestion.body, styleId: "wrap" }]),
          ...runtimeNotes.slice(0, 6).map((note) => ["nota", note.title, { value: note.body, styleId: "wrap" }]),
        ],
      },
    ]);
  }

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Analitica ejecutiva"
        title="Reportes con narrativa, KPIs y cortes exportables"
        description="Vista ejecutiva para demo: mezcla operación real, proyección comercial y contexto IA en una sola superficie."
        actions={
          <button className="button-primary" type="button" onClick={exportWorkbook}>
            <Download size={16} />
            Exportar Excel
          </button>
        }
      />

      <section className="hero-grid">
        <KpiCard label="Pipeline valorizado" value={formatMoney(projectedPipelineValue)} detail={`${activeOperations} operaciones activas con subsidios visibles por ${formatMoney(subsidyCommitted)}.`} signal="Estimado demo por etapa" icon={<Wallet size={18} />} />
        <KpiCard label="Conversion comercial" value={formatPercent(conversionRate)} detail={`${wonOperations} cierres ganados desde ${visibleProspects.length} prospectos visibles.`} signal={`Meta cubierta al ${formatPercent(goalAttainment)}`} icon={<TrendingUp size={18} />} />
        <KpiCard label="Pruebas de manejo" value={formatPercent(testDriveRate)} detail={`${completedTestDrives} pruebas completadas; si esto cae, el cierre del mes se enfría.`} signal="Indicador temprano" icon={<Target size={18} />} />
        <KpiCard label="Credito y papeleo" value={formatPercent(creditApprovalRate)} detail={`${missingCreditFiles} expedientes siguen frenados por documentos faltantes.`} signal="Riesgo de friccion" icon={<FileSpreadsheet size={18} />} />
        <KpiCard label="Retencion estimada" value={formatPercent(estimatedRetentionScore)} detail={`${atRiskFollowUps} seguimientos en riesgo y ${overdueFollowUps} ya vencidos.`} signal="Indicador sintetico demo" icon={<Gauge size={18} />} />
        <KpiCard label="Campana y bloqueos" value={`${openIncidents + blockedTasks}`} detail={`${openIncidents} incidentes abiertos y ${blockedTasks} tareas trabadas requieren seguimiento gerencial.`} signal="Atencion critica" icon={<AlertTriangle size={18} />} />
      </section>

      <section className="report-highlight-grid">
        {reportHighlights.map((highlight) => (
          <article key={highlight.title} className="panel report-highlight-card">
            <p className="eyebrow">{highlight.accent}</p>
            <strong>{highlight.title}</strong>
            <p>{highlight.body}</p>
          </article>
        ))}
      </section>

      <section className="report-chart-grid">
        <article className="panel chart-panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tendencia semanal</p>
              <h3>Actividad, alertas y pulso operativo</h3>
            </div>
            <span className="report-chip">Pulso demo</span>
          </div>
          <div className="report-chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData}>
                <defs>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f07a2b" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f07a2b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5cc8ff" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#5cc8ff" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3dfd0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="completed" stroke="#f07a2b" fill="url(#completedGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="pulse" stroke="#5cc8ff" fill="url(#pulseGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="report-footnote">
            <span>{completedTasks} tareas cerradas</span>
            <span>{openAlerts} alertas abiertas</span>
            <span>Score promedio {averageScore.toFixed(1)}</span>
          </div>
        </article>

        <article className="panel chart-panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Embudo comercial</p>
              <h3>De prospecto a cierre</h3>
            </div>
            <span className="report-chip">Visibilidad diaria</span>
          </div>
          <div className="report-chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3dfd0" />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                  {funnelData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="module-copy">La meta de esta vista es mostrar dónde se enfría el pipeline antes de fin de mes.</p>
        </article>
        <article className="panel chart-panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Etapas y valor</p>
              <h3>Valor ponderado por etapa</h3>
            </div>
            <span className="report-chip">MXN en miles</span>
          </div>
          <div className="report-chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineStageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3dfd0" />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} angle={-18} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="projected" radius={[14, 14, 0, 0]}>
                  {pipelineStageData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="module-copy">No es valuación financiera exacta; es una proyección demo para lectura ejecutiva rápida.</p>
        </article>

        <article className="panel chart-panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Credito</p>
              <h3>Estado de expedientes</h3>
            </div>
            <span className="report-chip">OpenOffice friendly</span>
          </div>
          <div className="report-chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={creditMixData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={98} paddingAngle={4}>
                  {creditMixData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-list">
            {creditMixData.map((entry, index) => (
              <span key={entry.name} className="report-legend-item">
                <i style={{ backgroundColor: chartPalette[index % chartPalette.length] }} />
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="support-grid">
        <article className="panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Forecast demo</p>
              <h3>Proyeccion de cierre a 4 semanas</h3>
            </div>
          </div>
          <div className="report-chart-shell report-chart-shell-sm">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="forecastProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffab49" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#ffab49" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3dfd0" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="projected" stroke="#f07a2b" fill="url(#forecastProjected)" strokeWidth={3} />
                <Area type="monotone" dataKey="conservative" stroke="#5cc8ff" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="report-footnote">
            <span>{readyToClose} listas para cierre</span>
            <span>{missingCreditFiles} expedientes incompletos</span>
            <span>{openIncidents} incidentes abiertos</span>
          </div>
        </article>

        <article className="panel stack-sm report-insight-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Lectura ejecutiva</p>
              <h3>Que vale la pena mover hoy</h3>
            </div>
          </div>
          <div className="stack-sm">
            {executiveSignals.map((signal) => (
              <div key={signal.title} className="detail-card report-insight-item">
                <strong>{signal.title}</strong>
                <p>{signal.body}</p>
              </div>
            ))}
            {!executiveSignals.length ? <p className="module-copy">La vista no detectó fricciones fuertes en este momento.</p> : null}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Equipo comercial</p>
              <h3>Rendimiento por asesor</h3>
            </div>
          </div>
          <div className="report-chart-shell report-chart-shell-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={advisorData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3dfd0" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="advisor" tickLine={false} axisLine={false} width={70} />
                <Tooltip />
                <Bar dataKey="score" fill="#f07a2b" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="report-metric-grid">
            {advisorData.map((advisor) => (
              <div key={advisor.advisor} className="agency-metric">
                <strong>{advisor.score.toFixed(0)}</strong>
                <p>
                  {advisor.advisor}: {advisor.cierres} cierres, {advisor.pruebas} pruebas, {advisor.prospectos} prospectos.
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Comparativo</p>
              <h3>Agencias visibles en este corte</h3>
            </div>
          </div>
          <div className="comparison-grid">
            {agencyMetrics.map((agency) => (
              <article key={agency.agency} className="agency-card flow-card">
                <div className="flow-column-header">
                  <strong>{agency.agency}</strong>
                  <span className="badge">{agency.creditApprovalRate}% aprobacion</span>
                </div>
                <div className="agency-metric-grid">
                  <div className="agency-metric">
                    <strong>{agency.activeProspects}</strong>
                    <p>Prospectos activos</p>
                  </div>
                  <div className="agency-metric">
                    <strong>{agency.scheduledTestDrives}</strong>
                    <p>Pruebas agendadas</p>
                  </div>
                  <div className="agency-metric">
                    <strong>{agency.readyToClose}</strong>
                    <p>Listas para cierre</p>
                  </div>
                  <div className="agency-metric">
                    <strong>{agency.openIncidents}</strong>
                    <p>Campanas abiertas</p>
                  </div>
                </div>
              </article>
            ))}
            {!agencyMetrics.length ? <p className="module-copy">No hay suficiente visibilidad multisucursal para armar comparativo.</p> : null}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack-sm report-insight-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Archivo IA</p>
              <h3>Ultimos reportes y narrativas</h3>
            </div>
            <span className="report-chip">
              <Bot size={14} />
              Capataz
            </span>
          </div>
          {runtimeReports.slice(0, 6).map((report) => (
            <div key={report.id} className="detail-card report-insight-item">
              <strong>{report.title}</strong>
              <p className="whatsapp-report">{report.body}</p>
              <span className="report-chip">{report.kind}</span>
            </div>
          ))}
          {!runtimeReports.length ? <p className="module-copy">Todavía no hay reportes generados por la IA.</p> : null}
        </article>

        <article className="panel stack-sm report-insight-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Contexto y notas</p>
              <h3>Memoria operativa que si sirve</h3>
            </div>
          </div>
          {runtimeSuggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.id} className="detail-card report-insight-item">
              <strong>{suggestion.title}</strong>
              <p>{suggestion.body}</p>
              <span className="report-chip">{suggestion.severity}</span>
            </div>
          ))}
          {runtimeNotes.slice(0, 3).map((note) => (
            <div key={note.id} className="detail-card report-insight-item">
              <strong>{note.title}</strong>
              <p>{note.body}</p>
              <span className="report-chip">memoria</span>
            </div>
          ))}
          {!runtimeNotes.length && !runtimeSuggestions.length ? <p className="module-copy">Todavía no hay memoria adicional guardada por Capataz.</p> : null}
        </article>
      </section>

      <section className="panel stack-sm">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Lectura rapida</p>
            <h3>Topline del corte</h3>
          </div>
        </div>
        <div className="report-table">
          {[
            ["Prospectos nuevos", visibleProspects.filter((prospect) => prospect.status === "new").length, "Entrada fresca al embudo"],
            ["Seguimiento vivo", visibleProspects.filter((prospect) => prospect.status === "follow_up").length, "Contactos por madurar"],
            ["Prospectos en prueba", visibleProspects.filter((prospect) => prospect.status === "test_drive").length, prospectStatusLabels.test_drive],
            ["Operaciones listas", readyToClose, "Negocio caliente para cierre"],
            ["Alertas sin leer", openAlerts, "Pendientes de revision"],
            ["Reportes IA", runtimeReports.length, "Cortes narrativos disponibles"],
          ].map(([label, value, note]) => (
            <div key={label as string} className="report-row">
              <strong>{label}</strong>
              <p>
                {value} <span>{note}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="module-copy report-export-note">La exportación genera un `.xls` XML simple y presentable para Excel u OpenOffice, sin depender de librerías externas.</p>
      </section>
    </div>
  );
}
