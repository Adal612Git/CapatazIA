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
import { AlertTriangle, Bot, Download, FileSpreadsheet, FileText, Gauge, Target, TrendingUp, Wallet } from "lucide-react";
import { colors } from "@lotosui/core";
import { ModuleHeader } from "@/components/module-header";
import { buildAgencyMetrics, collectAgencyNames, formatMoney } from "@/lib/automotive";
import { getDomainConfig } from "@/lib/domain-config";
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
import { downloadSpreadsheetXml, openPrintHtmlDocument } from "@/lib/utils";

const chartPalette = ["var(--cap-chart-1)", "var(--cap-chart-2)", "var(--cap-chart-3)", "var(--cap-chart-4)", "var(--cap-chart-5)", "var(--cap-chart-6)"];

const stageWeights: Record<string, number> = {
  prospecting: 0.2,
  test_drive: 0.38,
  negotiation: 0.58,
  credit_review: 0.72,
  ready_to_close: 0.92,
  closed_won: 1,
  closed_lost: 0,
};

function estimateOperationValue(systemMode: "automotive" | "hospital", operationLabel: string) {
  const normalized = operationLabel.toLowerCase();

  if (systemMode === "hospital") {
    if (normalized.includes("laparoscop")) return 138_000;
    if (normalized.includes("rodilla")) return 162_000;
    if (normalized.includes("resonancia")) return 18_000;
    if (normalized.includes("parto")) return 64_000;
    if (normalized.includes("trauma")) return 124_000;
    return 72_000;
  }

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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function severityStyle(severity: string) {
  if (severity === "critical") {
    return { label: "Critico", color: colors.status.error };
  }
  if (severity === "warning") {
    return { label: "Atencion", color: colors.status.warning };
  }
  return { label: "Estable", color: colors.status.success };
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

function buildExcelBar(value: number, max: number, width = 16) {
  if (max <= 0) {
    return "░".repeat(width);
  }

  const filled = Math.max(0, Math.min(width, Math.round((value / max) * width)));
  return `${"█".repeat(filled)}${"░".repeat(Math.max(width - filled, 0))}`;
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
  const systemMode = useAppStore((state) => state.systemMode);
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
  const domain = getDomainConfig(systemMode);
  const { creditStatusLabels, prospectStatusLabels, salesStageLabels } = domain;

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
  const projectedPipelineValue = visibleOperations.reduce(
    (sum, operation) => sum + estimateOperationValue(systemMode, operation.vehicleModel) * (stageWeights[operation.stage] ?? operation.closingProbability / 100),
    0,
  );
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
    projected: Math.round(
      visibleOperations
        .filter((operation) => operation.stage === stage)
        .reduce((sum, operation) => sum + estimateOperationValue(systemMode, operation.vehicleModel) * (operation.closingProbability / 100), 0) / 1000,
    ),
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
    { title: "Pipeline valorizado", body: `${formatMoney(projectedPipelineValue)} en valor ponderado por etapa y probabilidad.`, accent: "Corte ejecutivo" },
    { title: "Foco inmediato", body: `${missingCreditFiles} expedientes y ${openIncidents} incidentes de campana siguen frenando cierre.`, accent: "Bloqueos" },
    { title: "Retencion post-venta", body: `Indice demo estimado en ${formatPercent(estimatedRetentionScore)} con ${atRiskFollowUps} seguimientos en riesgo.`, accent: "Post-venta" },
    { title: "Cobertura del mes", body: `${formatPercent(goalAttainment)} de avance contra meta de ${salesGoal} operaciones cerradas.`, accent: "Meta mensual" },
  ];
  const decisionNarrative = [
    `El corte actual muestra ${activeOperations} ${domain.operationPlural} activas y un pipeline ponderado de ${formatMoney(projectedPipelineValue)}.`,
    readyToClose
      ? `${readyToClose} ${domain.operationPlural} ya estan maduras para empujarse a cierre esta misma semana.`
      : `No hay ${domain.operationPlural} listas para cierre inmediato; conviene destrabar etapas previas antes de prometer un forecast agresivo.`,
    missingCreditFiles || openIncidents
      ? `La friccion principal sigue estando en ${missingCreditFiles} expedientes con faltantes y ${openIncidents} incidentes abiertos que le pegan directo a conversion.`
      : "No se observan fricciones fuertes en expedientes o incidentes, asi que el foco puede pasar a acelerar seguimiento comercial.",
    `El score promedio del equipo esta en ${averageScore.toFixed(1)} y la retencion demo en ${formatPercent(estimatedRetentionScore)}, suficiente para sostener una narrativa solida en la presentacion.`,
  ];
  const operationalWatchlist = [
    {
      area: systemMode === "hospital" ? "Autorizaciones" : "Expedientes crediticios",
      owner: "Mesa operativa",
      severity: missingCreditFiles >= 3 ? "critical" : missingCreditFiles ? "warning" : "good",
      detail: missingCreditFiles
        ? `${missingCreditFiles} casos siguen frenados por documentos faltantes y requieren chase hoy mismo.`
        : "No hay casos atorados por documentacion en este corte.",
    },
    {
      area: domain.incidentPlural,
      owner: "Servicio / QA",
      severity: openIncidents >= 3 ? "critical" : openIncidents ? "warning" : "good",
      detail: openIncidents
        ? `${openIncidents} ${domain.incidentPlural} siguen abiertos y pueden erosionar retencion y reputacion.`
        : `No hay ${domain.incidentPlural} abiertas que comprometan la demo actual.`,
    },
    {
      area: domain.postSaleLabel,
      owner: "Post-venta",
      severity: overdueFollowUps >= 3 ? "critical" : overdueFollowUps ? "warning" : "good",
      detail: overdueFollowUps
        ? `${overdueFollowUps} seguimientos ya se vencieron; conviene reactivar clientes en riesgo antes del siguiente corte.`
        : "La base de post-venta esta controlada y sin vencimientos fuertes.",
    },
    {
      area: "Cierre comercial",
      owner: "Lider comercial",
      severity: readyToClose >= 3 ? "good" : "warning",
      detail: readyToClose
        ? `${readyToClose} oportunidades calientes permiten contar una historia de conversion inmediata.`
        : "Conviene madurar mas oportunidades para que el forecast no dependa de pocos casos.",
    },
  ];
  const workbookAgencyRows = agencyMetrics.length
    ? agencyMetrics.map((agency) => [
        agency.agency,
        { value: agency.activeProspects, styleId: "integer" },
        { value: agency.scheduledTestDrives, styleId: "integer" },
        { value: agency.readyToClose, styleId: "integer" },
        { value: agency.openIncidents, styleId: "integer" },
        { value: agency.creditApprovalRate / 100, styleId: "percent" },
      ])
    : [["Sin datos", "", "", "", "", ""]];
  const workbookAdvisorRows = advisorData.length
    ? advisorData.map((advisor) => [
        advisor.advisor,
        { value: advisor.score, styleId: "integer" },
        { value: advisor.prospectos, styleId: "integer" },
        { value: advisor.pruebas, styleId: "integer" },
        { value: advisor.cierres, styleId: "integer" },
      ])
    : [["Sin datos", "", "", "", ""]];
  const funnelMax = Math.max(...funnelData.map((entry) => entry.value), 1);
  const stageProjectedMax = Math.max(...pipelineStageData.map((entry) => entry.projected), 1);
  const weeklyMax = Math.max(...weeklyTrendData.map((entry) => entry.completed), 1);
  const forecastMax = Math.max(...forecastData.map((entry) => entry.projected), 1);
  const visualKpis = [
    { label: "Pipeline valorizado", value: formatMoney(projectedPipelineValue), note: `${activeOperations} ${domain.operationPlural} activas` },
    { label: "Conversion", value: formatPercent(conversionRate), note: `${wonOperations} cierres ganados` },
    { label: systemMode === "hospital" ? "Valoraciones" : "Pruebas", value: formatPercent(testDriveRate), note: `${completedTestDrives} completadas` },
    { label: "Aprobacion", value: formatPercent(creditApprovalRate), note: `${approvedCreditFiles} expedientes aprobados` },
    { label: "Retencion", value: formatPercent(estimatedRetentionScore), note: `${atRiskFollowUps} seguimientos en riesgo` },
    { label: "Bloqueos", value: `${openIncidents + blockedTasks}`, note: `${openIncidents} incidentes + ${blockedTasks} tareas` },
  ];
  const visualFunnelRows = funnelData.map((entry) => [
    entry.stage,
    { value: entry.value, styleId: "integer" },
    { value: buildExcelBar(entry.value, funnelMax, 20), styleId: "chartBar" },
  ]);
  const visualPipelineRows = pipelineStageData.map((entry) => [
    entry.stage,
    { value: entry.count, styleId: "integer" },
    { value: entry.projected, styleId: "integer" },
    { value: buildExcelBar(entry.projected, stageProjectedMax, 20), styleId: "chartBarCool" },
  ]);
  const visualWeeklyRows = weeklyTrendData.map((entry) => [
    entry.day,
    { value: entry.completed, styleId: "integer" },
    { value: entry.alerts, styleId: "integer" },
    { value: entry.pulse, styleId: "integer" },
    { value: buildExcelBar(entry.completed, weeklyMax, 18), styleId: "chartBarSuccess" },
  ]);
  const visualForecastRows = forecastData.map((entry) => [
    entry.week,
    { value: entry.projected, styleId: "integer" },
    { value: entry.conservative, styleId: "integer" },
    { value: buildExcelBar(entry.projected, forecastMax, 18), styleId: "chartBar" },
  ]);

  const executiveSignals = [
    blockedTasks ? { title: "Destrabar valuaciones y creditos", body: `${blockedTasks} tareas bloqueadas requieren resolución antes del siguiente corte.` } : null,
    readyToClose ? { title: "Empujar cierre de oportunidad caliente", body: `${readyToClose} operaciones ya están listas para firma y entrega.` } : null,
    overdueFollowUps ? { title: "Recuperar post-venta vencida", body: `${overdueFollowUps} seguimientos ya se vencieron y pueden empujar fuga a otra agencia.` } : null,
    latestReport ? { title: "Capataz ya generó corte IA", body: latestReport.title } : null,
  ].filter(Boolean) as Array<{ title: string; body: string }>;

  function exportWorkbook() {
    downloadSpreadsheetXml("capataz-reporte-ejecutivo.xls", "Capataz AI | Reporte ejecutivo", [
      {
        name: "Dashboard visual",
        columns: [180, 180, 180, 180],
        rows: [
          [{ value: `Capataz AI | ${systemMode === "hospital" ? "Executive Brief Hospitalario" : "Executive Brief Automotriz"}`, styleId: "hero", mergeAcross: 3 }],
          [{ value: `Generado por ${currentUser?.name ?? "Capataz AI"} · ${new Date().toLocaleString("es-MX")}`, styleId: "heroSubtle", mergeAcross: 3 }],
          [],
          ...visualKpis.flatMap((kpi, index) => {
            const column = index % 2 === 0 ? 0 : 2;
            const prefix = column === 0 ? [] : ["", ""];
            return index % 2 === 0
              ? [
                  [...prefix, { value: kpi.label, styleId: "cardLabel", mergeAcross: 1 }, { value: visualKpis[index + 1]?.label ?? "", styleId: "cardLabel", mergeAcross: 1 }],
                  [...prefix, { value: kpi.value, styleId: "cardValue", mergeAcross: 1 }, { value: visualKpis[index + 1]?.value ?? "", styleId: "cardValue", mergeAcross: 1 }],
                  [...prefix, { value: kpi.note, styleId: "cardNote", mergeAcross: 1 }, { value: visualKpis[index + 1]?.note ?? "", styleId: "cardNote", mergeAcross: 1 }],
                  [],
                ]
              : [];
          }),
          [{ value: "Narrativa ejecutiva", styleId: "section", mergeAcross: 3 }],
          ...decisionNarrative.map((paragraph) => [{ value: paragraph, styleId: "wrap", mergeAcross: 3 }]),
          [],
          [{ value: "Watchlist", styleId: "section", mergeAcross: 3 }],
          [{ value: "Area", styleId: "header" }, { value: "Owner", styleId: "header" }, { value: "Severidad", styleId: "header" }, { value: "Detalle", styleId: "header" }],
          ...operationalWatchlist.map((item) => [
            { value: item.area, styleId: "label" },
            item.owner,
            { value: item.severity === "good" ? "Estable" : item.severity === "warning" ? "Atencion" : "Critico", styleId: item.severity },
            { value: item.detail, styleId: "wrap" },
          ]),
        ],
      },
      {
        name: "Graficas",
        columns: [170, 90, 90, 210],
        rows: [
          [{ value: "Embudo comercial", styleId: "title", mergeAcross: 3 }],
          [],
          [{ value: "Etapa", styleId: "header" }, { value: "Volumen", styleId: "header" }, { value: "%", styleId: "header" }, { value: "Visual", styleId: "header" }],
          ...visualFunnelRows.map((row) => [
            { value: row[0] as string, styleId: "chartLabel" },
            row[1],
            { value: funnelMax ? (Number((row[1] as { value: number }).value) / funnelMax) : 0, styleId: "percent" },
            row[2],
          ]),
          [],
          [{ value: "Valor por etapa", styleId: "title", mergeAcross: 3 }],
          [],
          [{ value: "Etapa", styleId: "header" }, { value: "Ops", styleId: "header" }, { value: "Valor (mil)", styleId: "header" }, { value: "Visual", styleId: "header" }],
          ...visualPipelineRows.map((row) => [{ value: row[0] as string, styleId: "chartLabel" }, row[1], row[2], row[3]]),
          [],
          [{ value: "Ritmo semanal", styleId: "title", mergeAcross: 3 }],
          [],
          [{ value: "Dia", styleId: "header" }, { value: "Completadas", styleId: "header" }, { value: "Alertas", styleId: "header" }, { value: "Pulso visual", styleId: "header" }],
          ...visualWeeklyRows.map((row) => [{ value: row[0] as string, styleId: "chartLabel" }, row[1], row[2], row[4]]),
          [],
          [{ value: "Forecast", styleId: "title", mergeAcross: 3 }],
          [],
          [{ value: "Semana", styleId: "header" }, { value: "Proyectado", styleId: "header" }, { value: "Conservador", styleId: "header" }, { value: "Visual", styleId: "header" }],
          ...visualForecastRows.map((row) => [{ value: row[0] as string, styleId: "chartLabel" }, row[1], row[2], row[3]]),
        ],
      },
      {
        name: "Resumen",
        columns: [240, 140, 420],
        rows: [
          [{ value: `Capataz AI | Corte ejecutivo ${systemMode === "hospital" ? "hospitalario" : "automotriz"}`, styleId: "title" }],
          [{ value: `Generado por ${currentUser?.name ?? "Capataz AI"}`, styleId: "subtle" }],
          [],
          [{ value: "Indicador", styleId: "header" }, { value: "Valor", styleId: "header" }, { value: "Lectura", styleId: "header" }],
          [{ value: "Pipeline valorizado", styleId: "label" }, { value: projectedPipelineValue, styleId: "currency" }, { value: "Valor ponderado del pipeline vivo con lectura por etapa y probabilidad.", styleId: "wrap" }],
          [{ value: "Conversion", styleId: "label" }, { value: conversionRate / 100, styleId: "percent" }, { value: "Prospectos visibles que ya cerraron favorablemente.", styleId: "wrap" }],
          [{ value: systemMode === "hospital" ? "Valoraciones" : "Pruebas de manejo", styleId: "label" }, { value: testDriveRate / 100, styleId: "percent" }, { value: systemMode === "hospital" ? "Ingresos visibles que si pasaron por valoracion." : "Prospectos que si llegaron a prueba de unidad.", styleId: "wrap" }],
          [{ value: "Aprobacion crediticia", styleId: "label" }, { value: creditApprovalRate / 100, styleId: "percent" }, { value: "Expedientes resueltos favorablemente frente al total decidido.", styleId: "wrap" }],
          [{ value: "Retencion estimada demo", styleId: "label" }, { value: estimatedRetentionScore / 100, styleId: "percent" }, { value: "Indice sintetico de permanencia estimada segun seguimiento y post-venta.", styleId: "wrap" }],
          [{ value: "Subsidio comprometido", styleId: "label" }, { value: subsidyCommitted, styleId: "currency" }, { value: "Apoyos comerciales visibles dentro de operaciones activas.", styleId: "wrap" }],
          [{ value: "Score promedio", styleId: "label" }, { value: averageScore, styleId: "integer" }, { value: "Pulso sintetico del equipo visible en este corte.", styleId: "wrap" }],
          [{ value: "Tareas cerradas", styleId: "label" }, { value: completedTasks, styleId: "integer" }, { value: "Ejecucion operativa terminada dentro del tablero.", styleId: "wrap" }],
          [],
          [{ value: "Narrativa ejecutiva", styleId: "section" }],
          ...decisionNarrative.map((paragraph) => [{ value: paragraph, styleId: "wrap" }]),
          [],
          [{ value: "Alertas ejecutivas", styleId: "header" }, { value: "Detalle", styleId: "header" }, { value: "Prioridad", styleId: "header" }],
          ...reportHighlights.map((highlight) => [highlight.title, { value: highlight.body, styleId: "wrap" }, highlight.accent]),
        ],
      },
      {
        name: "Pipeline",
        columns: [110, 180, 150, 180, 130, 90, 130, 240],
        rows: [
          [{ value: "Pipeline comercial", styleId: "title" }],
          [],
          [{ value: "Operacion", styleId: "header" }, { value: systemMode === "hospital" ? "Paciente" : "Cliente", styleId: "header" }, { value: systemMode === "hospital" ? "Hospital" : "Agencia", styleId: "header" }, { value: systemMode === "hospital" ? "Servicio" : "Vehiculo", styleId: "header" }, { value: "Etapa", styleId: "header" }, { value: "Probabilidad", styleId: "header" }, { value: "Valor estimado", styleId: "header" }, { value: "Siguiente paso", styleId: "header" }],
          ...visibleOperations.map((operation) => [operation.id, operation.customerName, operation.agency, operation.vehicleModel, salesStageLabels[operation.stage], { value: operation.closingProbability / 100, styleId: "percent" }, { value: estimateOperationValue(systemMode, operation.vehicleModel), styleId: "currency" }, { value: operation.nextStep, styleId: "wrap" }]),
        ],
      },
      {
        name: "Expedientes",
        columns: [110, 180, 140, 150, 130, 100, 250],
        rows: [
          [{ value: "Estado crediticio", styleId: "title" }],
          [],
          [{ value: systemMode === "hospital" ? "Autorizacion" : "Expediente", styleId: "header" }, { value: systemMode === "hospital" ? "Paciente" : "Cliente", styleId: "header" }, { value: systemMode === "hospital" ? "Hospital" : "Agencia", styleId: "header" }, { value: systemMode === "hospital" ? "Aseguradora" : "Financiera", styleId: "header" }, { value: "Estado", styleId: "header" }, { value: "Recibidos", styleId: "header" }, { value: "Faltantes", styleId: "header" }],
          ...visibleCreditFiles.map((creditFile) => [creditFile.id, creditFile.customerName, creditFile.agency, creditFile.financier, creditStatusLabels[creditFile.status], creditFile.receivedDocuments.length, { value: creditFile.missingDocuments.join(", "), styleId: "wrap" }]),
        ],
      },
      {
        name: "Watchlist",
        columns: [180, 140, 120, 340],
        rows: [
          [{ value: "Watchlist operativo", styleId: "title" }],
          [],
          [{ value: "Area", styleId: "header" }, { value: "Owner", styleId: "header" }, { value: "Severidad", styleId: "header" }, { value: "Detalle", styleId: "header" }],
          ...operationalWatchlist.map((item) => [
            item.area,
            item.owner,
            { value: item.severity === "good" ? "Estable" : item.severity === "warning" ? "Atencion" : "Critico", styleId: item.severity },
            { value: item.detail, styleId: "wrap" },
          ]),
        ],
      },
      {
        name: "Sedes",
        columns: [170, 100, 100, 100, 100, 120],
        rows: [
          [{ value: systemMode === "hospital" ? "Comparativo por hospital" : "Comparativo por agencia", styleId: "title" }],
          [],
          [{ value: systemMode === "hospital" ? "Hospital" : "Agencia", styleId: "header" }, { value: "Prospectos", styleId: "header" }, { value: systemMode === "hospital" ? "Valoraciones" : "Pruebas", styleId: "header" }, { value: "Cierres listos", styleId: "header" }, { value: "Incidentes", styleId: "header" }, { value: "Aprobacion", styleId: "header" }],
          ...workbookAgencyRows,
        ],
      },
      {
        name: "Asesores",
        columns: [160, 100, 110, 100, 90],
        rows: [
          [{ value: "Topline por asesor", styleId: "title" }],
          [],
          [{ value: "Asesor", styleId: "header" }, { value: "Score", styleId: "header" }, { value: "Prospectos", styleId: "header" }, { value: "Pruebas", styleId: "header" }, { value: "Cierres", styleId: "header" }],
          ...workbookAdvisorRows,
        ],
      },
      {
        name: "IA y memoria",
        columns: [120, 220, 460],
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

  function exportPdf() {
    const generatedBy = currentUser?.name ?? "Capataz AI";
    const timestamp = new Date().toLocaleString("es-MX");
    const metricCards = [
      { label: "Pipeline valorizado", value: formatMoney(projectedPipelineValue), note: `${activeOperations} ${domain.operationPlural} activas` },
      { label: "Conversion", value: formatPercent(conversionRate), note: `${wonOperations} cierres ganados` },
      { label: systemMode === "hospital" ? "Valoraciones" : "Pruebas", value: formatPercent(testDriveRate), note: `${completedTestDrives} completadas` },
      { label: "Aprobacion", value: formatPercent(creditApprovalRate), note: `${approvedCreditFiles} expedientes aprobados` },
      { label: "Retencion", value: formatPercent(estimatedRetentionScore), note: `${atRiskFollowUps} seguimientos en riesgo` },
      { label: "Bloqueos", value: `${openIncidents + blockedTasks}`, note: `${openIncidents} incidentes + ${blockedTasks} tareas` },
    ];

    const reportHtml = `
      <main style="font-family: Inter, Aptos, Segoe UI, sans-serif; background:${colors.light.background.primary}; color:${colors.light.foreground.primary}; min-height:100vh; padding:40px;">
        <section style="background:linear-gradient(135deg, ${colors.deepNavy} 0%, ${colors.oceanBlue} 100%); color:${colors.pureWhite}; border-radius:28px; padding:32px 36px; box-shadow:0 18px 40px rgba(8, 21, 56, 0.24);">
          <div style="display:flex; justify-content:space-between; gap:24px; align-items:flex-start;">
            <div>
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; opacity:0.78;">Capataz AI Executive Brief</p>
              <h1 style="margin:0; font-size:30px; line-height:1.1;">Reporte ejecutivo ${systemMode === "hospital" ? "hospitalario" : "automotriz"}</h1>
              <p style="margin:14px 0 0; font-size:14px; line-height:1.7; max-width:760px;">Vista consolidada del sistema unificado: operacion, IA, seguimiento, score y capa fintech sobre una sola fuente de verdad.</p>
            </div>
            <div style="min-width:220px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18); border-radius:20px; padding:16px 18px;">
              <p style="margin:0 0 6px; font-size:12px; opacity:0.78;">Generado por</p>
              <strong style="display:block; font-size:18px;">${escapeHtml(generatedBy)}</strong>
              <p style="margin:10px 0 0; font-size:12px; opacity:0.78;">${escapeHtml(timestamp)}</p>
            </div>
          </div>
        </section>

        <section style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:16px; margin-top:20px;">
          ${metricCards
            .map(
              (card) => `
                <article style="background:${colors.light.background.card}; border:1px solid ${colors.light.border.default}; border-radius:20px; padding:18px 20px; break-inside:avoid;">
                  <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:${colors.light.foreground.muted};">${escapeHtml(card.label)}</p>
                  <strong style="display:block; margin-top:10px; font-size:28px; color:${colors.deepNavy};">${escapeHtml(card.value)}</strong>
                  <p style="margin:8px 0 0; font-size:13px; line-height:1.5; color:${colors.light.foreground.secondary};">${escapeHtml(card.note)}</p>
                </article>`,
            )
            .join("")}
        </section>

        <section style="margin-top:24px; display:grid; grid-template-columns:1.2fr 0.8fr; gap:18px;">
          <article style="background:${colors.light.background.card}; border:1px solid ${colors.light.border.default}; border-radius:24px; padding:22px;">
            <p style="margin:0 0 10px; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:${colors.accent.primary};">Narrativa ejecutiva</p>
            <h2 style="margin:0 0 14px; font-size:22px; color:${colors.deepNavy};">Lo que conviene explicar en la demo</h2>
            ${decisionNarrative
              .map((paragraph) => `<p style="margin:0 0 12px; font-size:14px; line-height:1.75; color:${colors.light.foreground.secondary};">${escapeHtml(paragraph)}</p>`)
              .join("")}
          </article>
          <article style="background:${colors.light.background.card}; border:1px solid ${colors.light.border.default}; border-radius:24px; padding:22px;">
            <p style="margin:0 0 10px; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:${colors.accent.primary};">Watchlist</p>
            <h2 style="margin:0 0 14px; font-size:22px; color:${colors.deepNavy};">Fricciones por owner</h2>
            ${operationalWatchlist
              .map((item) => {
                const style = severityStyle(item.severity);
                return `<div style="padding:14px 0; border-top:1px solid ${colors.light.border.default};">
                  <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
                    <strong style="font-size:15px; color:${colors.deepNavy};">${escapeHtml(item.area)}</strong>
                    <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:${style.color};">${escapeHtml(style.label)}</span>
                  </div>
                  <p style="margin:6px 0 0; font-size:13px; color:${colors.light.foreground.secondary};">${escapeHtml(item.owner)}: ${escapeHtml(item.detail)}</p>
                </div>`;
              })
              .join("")}
          </article>
        </section>

        <section style="margin-top:24px; display:grid; grid-template-columns:1fr 1fr; gap:18px;">
          <article style="background:${colors.light.background.card}; border:1px solid ${colors.light.border.default}; border-radius:24px; padding:22px;">
            <p style="margin:0 0 10px; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:${colors.accent.primary};">Sedes visibles</p>
            <h2 style="margin:0 0 14px; font-size:22px; color:${colors.deepNavy};">${escapeHtml(systemMode === "hospital" ? "Comparativo por hospital" : "Comparativo por agencia")}</h2>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr>
                  <th style="text-align:left; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Sede</th>
                  <th style="text-align:right; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Prospectos</th>
                  <th style="text-align:right; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">${escapeHtml(systemMode === "hospital" ? "Valoraciones" : "Pruebas")}</th>
                  <th style="text-align:right; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Cierres listos</th>
                  <th style="text-align:right; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Aprobacion</th>
                </tr>
              </thead>
              <tbody>
                ${agencyMetrics
                  .map(
                    (agency) => `<tr>
                      <td style="padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">${escapeHtml(agency.agency)}</td>
                      <td style="padding:10px 8px; text-align:right; border-bottom:1px solid ${colors.light.border.default};">${agency.activeProspects}</td>
                      <td style="padding:10px 8px; text-align:right; border-bottom:1px solid ${colors.light.border.default};">${agency.scheduledTestDrives}</td>
                      <td style="padding:10px 8px; text-align:right; border-bottom:1px solid ${colors.light.border.default};">${agency.readyToClose}</td>
                      <td style="padding:10px 8px; text-align:right; border-bottom:1px solid ${colors.light.border.default};">${agency.creditApprovalRate}%</td>
                    </tr>`,
                  )
                  .join("") || `<tr><td colspan="5" style="padding:16px 8px; color:${colors.light.foreground.muted};">Sin comparativo multisede disponible.</td></tr>`}
              </tbody>
            </table>
          </article>

          <article style="background:${colors.light.background.card}; border:1px solid ${colors.light.border.default}; border-radius:24px; padding:22px;">
            <p style="margin:0 0 10px; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:${colors.accent.primary};">Topline por asesor</p>
            <h2 style="margin:0 0 14px; font-size:22px; color:${colors.deepNavy};">Ranking de ejecucion</h2>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr>
                  <th style="text-align:left; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Asesor</th>
                  <th style="text-align:right; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Score</th>
                  <th style="text-align:right; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Prospectos</th>
                  <th style="text-align:right; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Pruebas</th>
                  <th style="text-align:right; padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">Cierres</th>
                </tr>
              </thead>
              <tbody>
                ${advisorData
                  .map(
                    (advisor) => `<tr>
                      <td style="padding:10px 8px; border-bottom:1px solid ${colors.light.border.default};">${escapeHtml(advisor.advisor)}</td>
                      <td style="padding:10px 8px; text-align:right; border-bottom:1px solid ${colors.light.border.default};">${advisor.score.toFixed(0)}</td>
                      <td style="padding:10px 8px; text-align:right; border-bottom:1px solid ${colors.light.border.default};">${advisor.prospectos}</td>
                      <td style="padding:10px 8px; text-align:right; border-bottom:1px solid ${colors.light.border.default};">${advisor.pruebas}</td>
                      <td style="padding:10px 8px; text-align:right; border-bottom:1px solid ${colors.light.border.default};">${advisor.cierres}</td>
                    </tr>`,
                  )
                  .join("") || `<tr><td colspan="5" style="padding:16px 8px; color:${colors.light.foreground.muted};">Sin ranking visible para este usuario.</td></tr>`}
              </tbody>
            </table>
          </article>
        </section>
      </main>
    `;

    openPrintHtmlDocument("capataz-reporte-ejecutivo", reportHtml);
  }

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Analitica ejecutiva"
        title="Reportes con narrativa, KPIs y cortes exportables"
        description={`Vista ejecutiva para demo: mezcla operacion real de ${domain.reportContext}, proyeccion y contexto IA en una sola superficie.`}
        actions={
          <>
            <span className="report-chip">build reports v2</span>
            <button className="button-secondary" type="button" onClick={exportPdf}>
              <FileText size={16} />
              Exportar PDF
            </button>
            <button className="button-primary" type="button" onClick={exportWorkbook}>
              <Download size={16} />
              Exportar Excel
            </button>
          </>
        }
      />

      <section className="hero-grid">
        <KpiCard label="Pipeline valorizado" value={formatMoney(projectedPipelineValue)} detail={`${activeOperations} ${domain.operationPlural} activas con ${domain.subsidyLabel.toLowerCase()} visible por ${formatMoney(subsidyCommitted)}.`} signal="Estimado demo por etapa" icon={<Wallet size={18} />} />
        <KpiCard label="Conversion operativa" value={formatPercent(conversionRate)} detail={`${wonOperations} cierres ganados desde ${visibleProspects.length} ${domain.leadPlural} visibles.`} signal={`Meta cubierta al ${formatPercent(goalAttainment)}`} icon={<TrendingUp size={18} />} />
        <KpiCard label={systemMode === "hospital" ? "Valoraciones" : "Pruebas de manejo"} value={formatPercent(testDriveRate)} detail={`${completedTestDrives} ${domain.testDrivePlural} completadas.`} signal="Indicador temprano" icon={<Target size={18} />} />
        <KpiCard label={systemMode === "hospital" ? "Autorizaciones" : "Credito y papeleo"} value={formatPercent(creditApprovalRate)} detail={`${missingCreditFiles} ${domain.creditPlural} siguen frenadas por documentos faltantes.`} signal="Riesgo de friccion" icon={<FileSpreadsheet size={18} />} />
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

      <section className="dashboard-grid">
        <article className="panel stack-sm report-insight-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Narrativa para la junta</p>
              <h3>Que conviene decir y por que</h3>
            </div>
            <span className="report-chip">Storyline</span>
          </div>
          <div className="stack-sm">
            {decisionNarrative.map((paragraph) => (
              <div key={paragraph} className="detail-card report-insight-item">
                <p>{paragraph}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel stack-sm report-insight-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Watchlist operativo</p>
              <h3>Owners, severidad y siguiente foco</h3>
            </div>
          </div>
          <div className="stack-sm">
            {operationalWatchlist.map((item) => {
              const style = severityStyle(item.severity);
              return (
                <div key={item.area} className="detail-card report-insight-item">
                  <strong>{item.area}</strong>
                  <p>{item.detail}</p>
                  <span className="report-chip" style={{ color: style.color, borderColor: style.color }}>
                    {style.label} · {item.owner}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
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
              <p className="eyebrow">{systemMode === "hospital" ? "Embudo asistencial" : "Embudo comercial"}</p>
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
              <h3>{systemMode === "hospital" ? "Hospitales visibles en este corte" : "Agencias visibles en este corte"}</h3>
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
            [systemMode === "hospital" ? "Ingresos nuevos" : "Prospectos nuevos", visibleProspects.filter((prospect) => prospect.status === "new").length, "Entrada fresca al embudo"],
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
        <p className="module-copy report-export-note">La exportacion ahora genera un Excel enriquecido y un PDF listo para imprimir o guardar desde el navegador, ambos con narrativa, watchlist y tablas ejecutivas para demo.</p>
      </section>
    </div>
  );
}
