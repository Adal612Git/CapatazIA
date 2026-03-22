import { NextResponse } from "next/server";
import { recomputeScoreSnapshots, scoreBand } from "@/lib/score";
import { taskInputSchema } from "@/lib/contracts";
import { canCreateTasks } from "@/lib/permissions";
import { getRuntimeSyncPayload, replaceRuntimeSyncPayload } from "@/lib/capataz-operativo";
import type {
  Alert,
  GeneratedReport,
  RuntimeSyncPayload,
  ScoreSnapshot,
  SystemMode,
  Task,
  TaskInput,
  User,
} from "@/lib/types";

export function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

function buildTraceId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

export function okResponse<T>(data: T, options?: { status?: number; systemMode?: SystemMode; extraMeta?: Record<string, unknown> }) {
  const traceId = buildTraceId();
  return NextResponse.json(
    {
      data,
      meta: {
        traceId,
        generatedAt: nowIso(),
        systemMode: options?.systemMode,
        ...options?.extraMeta,
      },
    },
    { status: options?.status ?? 200 },
  );
}

export function errorResponse(status: number, code: string, message: string, options?: { details?: unknown; systemMode?: SystemMode }) {
  const traceId = buildTraceId();
  return NextResponse.json(
    {
      error: {
        code,
        message,
        traceId,
        details: options?.details,
      },
      meta: {
        traceId,
        generatedAt: nowIso(),
        systemMode: options?.systemMode,
      },
    },
    { status },
  );
}

function appendActivity(payload: RuntimeSyncPayload, actorId: string, message: string) {
  return [
    {
      id: crypto.randomUUID(),
      actorId,
      message,
      createdAt: nowIso(),
    },
    ...payload.activity,
  ];
}

function buildChecklistFromInput(input: TaskInput, taskId: string, checklistId: string) {
  const isCritical = input.priority === "critical" || input.priority === "high";
  const evidenceLabel = input.tags.some((tag) => tag.toLowerCase().includes("evidencia"))
    ? "Validar evidencia etiquetada"
    : "Subir evidencia del trabajo";

  return {
    id: checklistId,
    taskId,
    templateName: isCritical ? "Checklist de ejecucion critica" : "Checklist operativo de campo",
    assigneeId: input.assigneeId,
    status: "pending" as const,
    items: [
      { id: crypto.randomUUID(), label: `Confirmar arranque en ${input.location}`, done: false, required: true },
      { id: crypto.randomUUID(), label: evidenceLabel, done: false, required: true },
      {
        id: crypto.randomUUID(),
        label: isCritical ? "Liberar cierre con validacion de supervisor" : "Validar cierre operativo",
        done: false,
        required: true,
      },
    ],
  };
}

function refreshScores(payload: RuntimeSyncPayload) {
  return recomputeScoreSnapshots({
    users: payload.users,
    tasks: payload.tasks,
    checklists: payload.checklists,
    activity: payload.activity,
    previousSnapshots: payload.scoreSnapshots,
  });
}

export async function createTaskInRuntime({
  systemMode,
  actorId,
  task,
}: {
  systemMode: SystemMode;
  actorId: string;
  task: TaskInput;
}) {
  const payload = await getRuntimeSyncPayload(systemMode);
  const actor = payload.users.find((entry) => entry.id === actorId);

  if (!actor) {
    return { ok: false as const, status: 404, code: "ACTOR_NOT_FOUND", message: "No se encontro el actor solicitado." };
  }

  if (!canCreateTasks(actor.role)) {
    return { ok: false as const, status: 403, code: "FORBIDDEN", message: "Tu perfil no puede crear tareas." };
  }

  const parsed = taskInputSchema.safeParse(task);
  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Payload invalido.",
      details: parsed.error.flatten(),
    };
  }

  const assignee = payload.users.find((entry) => entry.id === task.assigneeId);
  if (!assignee) {
    return { ok: false as const, status: 404, code: "ASSIGNEE_NOT_FOUND", message: "El responsable seleccionado no existe." };
  }

  const pendingColumn = payload.tasks.filter((entry) => entry.columnId === "pending").length;
  const pendingLimit = 8;
  if (pendingColumn >= pendingLimit) {
    return {
      ok: false as const,
      status: 409,
      code: "WIP_LIMIT_REACHED",
      message: `La columna Pendiente ya alcanzo su limite WIP de ${pendingLimit}.`,
    };
  }

  const taskId = crypto.randomUUID();
  const checklistId = task.requiresChecklist ? crypto.randomUUID() : undefined;
  const createdAt = nowIso();
  const nextTask: Task = {
    id: taskId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    columnId: "pending",
    assigneeId: task.assigneeId,
    reporterId: actorId,
    dueAt: task.dueAt,
    createdAt,
    updatedAt: createdAt,
    location: task.location,
    tags: task.tags,
    requiresChecklist: task.requiresChecklist,
    checklistInstanceId: checklistId,
  };

  const nextChecklist = checklistId ? buildChecklistFromInput(task, taskId, checklistId) : null;
  const nextActivity = appendActivity(payload, actorId, `Creo la tarea "${nextTask.title}"`);
  const nextPayload: RuntimeSyncPayload = {
    ...payload,
    tasks: [nextTask, ...payload.tasks],
    checklists: nextChecklist ? [nextChecklist, ...payload.checklists] : payload.checklists,
    activity: nextActivity,
    scoreSnapshots: refreshScores({
      ...payload,
      tasks: [nextTask, ...payload.tasks],
      checklists: nextChecklist ? [nextChecklist, ...payload.checklists] : payload.checklists,
      activity: nextActivity,
    }),
  };

  const stored = await replaceRuntimeSyncPayload(nextPayload);
  const storedTask = stored.tasks.find((entry) => entry.id === taskId) ?? nextTask;

  return {
    ok: true as const,
    payload: stored,
    task: storedTask,
    assignee,
  };
}

export function buildDashboardSummary(payload: RuntimeSyncPayload, currentUser?: User | null) {
  const scopedTasks =
    currentUser?.role === "operator" ? payload.tasks.filter((task) => task.assigneeId === currentUser.id) : payload.tasks;
  const scopedScores =
    currentUser?.role === "operator"
      ? payload.scoreSnapshots.filter((snapshot) => snapshot.userId === currentUser.id)
      : payload.scoreSnapshots;
  const unreadAlerts = payload.alerts.filter((alert) => !alert.read);
  const criticalTasks = scopedTasks
    .filter((task) => task.columnId !== "done" && (task.priority === "critical" || task.priority === "high"))
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt))
    .slice(0, 5)
    .map((task) => {
      const assignee = payload.users.find((user) => user.id === task.assigneeId);
      return {
        id: task.id,
        title: task.title,
        priority: task.priority,
        columnId: task.columnId,
        dueAt: task.dueAt,
        location: task.location,
        assignee: assignee ? { id: assignee.id, name: assignee.name, role: assignee.role } : null,
      };
    });
  const leader = [...scopedScores].sort((left, right) => right.score - left.score)[0];
  const leaderUser = payload.users.find((user) => user.id === leader?.userId);

  return {
    kpis: {
      activeTasks: scopedTasks.filter((task) => task.columnId !== "done").length,
      blockedTasks: scopedTasks.filter((task) => task.columnId === "blocked").length,
      unreadAlerts: unreadAlerts.length,
      completedToday: payload.tasks.filter((task) => task.columnId === "done").length,
      scoreLeader: leader
        ? {
            userId: leader.userId,
            name: leaderUser?.name ?? "Sin lider",
            score: leader.score,
            band: scoreBand(leader.score),
          }
        : null,
    },
    criticalTasks,
    alerts: unreadAlerts.slice(0, 5).map((alert) => ({
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      createdAt: alert.createdAt,
      relatedTaskId: alert.relatedTaskId ?? null,
    })),
    demoFlow: [
      { step: "Login", status: "ready" },
      { step: "Dashboard", status: "ready" },
      { step: "Crear tarea", status: "ready" },
      { step: "Mover en Kanban", status: "ready" },
      { step: "Score", status: "ready" },
      { step: "Reporte", status: "ready" },
    ],
  };
}

export function buildScoresSummary(payload: RuntimeSyncPayload) {
  const ordered = [...payload.scoreSnapshots].sort((left, right) => right.score - left.score);
  const average = ordered.length ? ordered.reduce((sum, snapshot) => sum + snapshot.score, 0) / ordered.length : 0;

  return {
    averageScore: Number(average.toFixed(1)),
    highBandCount: ordered.filter((snapshot) => snapshot.score >= 85).length,
    midBandCount: ordered.filter((snapshot) => snapshot.score >= 70 && snapshot.score < 85).length,
    lowBandCount: ordered.filter((snapshot) => snapshot.score < 70).length,
    leaderboard: ordered.slice(0, 8).map((snapshot: ScoreSnapshot) => {
      const user = payload.users.find((entry) => entry.id === snapshot.userId);
      return {
        userId: snapshot.userId,
        name: user?.name ?? snapshot.userId,
        role: user?.role ?? null,
        score: snapshot.score,
        trend: snapshot.trend,
        band: scoreBand(snapshot.score),
        compliance: snapshot.compliance,
        speed: snapshot.speed,
        consistency: snapshot.consistency,
        activity: snapshot.activity,
        note: snapshot.note,
      };
    }),
    formula: {
      window: "28 dias moviles",
      weights: {
        compliance: 0.35,
        speed: 0.25,
        consistency: 0.25,
        activity: 0.15,
      },
    },
  };
}

export function buildExecutiveReport(payload: RuntimeSyncPayload, options?: { kind?: GeneratedReport["kind"]; targetUserId?: string }) {
  const activeTasks = payload.tasks.filter((task) => task.columnId !== "done");
  const blockedTasks = activeTasks.filter((task) => task.columnId === "blocked");
  const unreadAlerts = payload.alerts.filter((alert) => !alert.read);
  const readyToClose = payload.salesOperations.filter((operation) => operation.stage === "ready_to_close").length;
  const missingCreditFiles = payload.creditFiles.filter((creditFile) => creditFile.status === "missing_documents").length;
  const atRiskFollowUps = payload.postSaleFollowUps.filter((followUp) => followUp.status === "at_risk").length;
  const leader = [...payload.scoreSnapshots].sort((left, right) => right.score - left.score)[0];
  const leaderUser = payload.users.find((user) => user.id === leader?.userId);
  const targetUser = options?.targetUserId ? payload.users.find((user) => user.id === options.targetUserId) : null;
  const reportKind = options?.kind ?? "general";

  const title =
    reportKind === "daily_closure"
      ? "Cierre diario ejecutivo"
      : reportKind === "blockers"
        ? "Reporte de bloqueos criticos"
        : reportKind === "team_member" && targetUser
          ? `Reporte individual de ${targetUser.name}`
          : "Reporte ejecutivo Capataz";

  const body = [
    `Capataz detecta ${activeTasks.length} tareas activas y ${blockedTasks.length} bloqueos reales en el runtime operativo.`,
    `Hay ${unreadAlerts.length} alertas sin leer, ${readyToClose} operaciones listas para cierre y ${missingCreditFiles} expedientes con documentos faltantes.`,
    `El score lider es ${leader?.score ?? 0} y lo sostiene ${leaderUser?.name ?? "sin referente visible"} con banda ${leader ? scoreBand(leader.score) : "n/a"}.`,
    `Post-venta trae ${atRiskFollowUps} seguimientos en riesgo; conviene moverlos antes de prometer conversion adicional.`,
    targetUser
      ? `Este corte esta enfocado en ${targetUser.name} para revisar carga operativa, score y oportunidad de coaching.`
      : "La lectura de demo ya es vendible: crear, ejecutar, medir y reportar viven sobre el mismo runtime.",
  ].join(" ");

  return {
    id: crypto.randomUUID(),
    kind: reportKind,
    title,
    body,
    generatedAt: nowIso(),
    targetUserId: targetUser?.id,
  } satisfies GeneratedReport;
}

export async function persistReportInRuntime(systemMode: SystemMode, report: GeneratedReport) {
  const payload = await getRuntimeSyncPayload(systemMode);
  const nextPayload: RuntimeSyncPayload = {
    ...payload,
    reports: [report, ...payload.reports].slice(0, 30),
  };
  await replaceRuntimeSyncPayload(nextPayload);
}
