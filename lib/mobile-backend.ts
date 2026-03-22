import { financeProductCatalog, formatFinanceMoney, getFinanceProductsForUser, getUserFinanceAccounts, getUserFinanceApplications, getUserFinanceMovements, getUserScoreSnapshot, getVisibleFinanceInsights } from "@/lib/fintech";
import { getRuntimeSyncPayload, replaceRuntimeSyncPayload } from "@/lib/capataz-operativo";
import type {
  FinanceApplication,
  FinanceInsight,
  RuntimeSyncPayload,
  ScoreSnapshot,
  SystemMode,
  User,
} from "@/lib/types";

function scoreBreakdownFromSnapshot(snapshot: ScoreSnapshot | null) {
  return {
    cumplimiento: snapshot?.compliance ?? 0,
    velocidad: snapshot?.speed ?? 0,
    consistencia: snapshot?.consistency ?? 0,
    actividad: snapshot?.activity ?? 0,
  };
}

function scoreHistoryFromSnapshot(snapshot: ScoreSnapshot | null) {
  const current = snapshot?.score ?? 0;
  const delta = snapshot?.trend === "up" ? 3 : snapshot?.trend === "down" ? -3 : 1;

  return ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"].map((week, index) => {
    const offset = 5 - index;
    return {
      week,
      score: Math.max(40, Math.min(99, current - offset * delta - (offset % 2 === 0 ? 1 : 0))),
    };
  });
}

function buildTeamScores(user: User, payload: RuntimeSyncPayload) {
  return payload.users
    .filter((entry) => entry.siteId === user.siteId || entry.groupId === user.groupId)
    .map((entry) => {
      const snapshot = getUserScoreSnapshot(entry.id, payload.scoreSnapshots);
      const score = snapshot?.score ?? 0;
      return {
        name: entry.name,
        role: entry.role,
        score,
        avatar: entry.avatar,
        trend: snapshot?.trend === "up" ? "+3" : snapshot?.trend === "down" ? "-2" : "+1",
        isMe: entry.id === user.id,
      };
    })
    .sort((left, right) => right.score - left.score);
}

function buildTasksForUser(user: User, payload: RuntimeSyncPayload) {
  return payload.tasks
    .filter((task) => task.assigneeId === user.id)
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt))
    .slice(0, 6)
    .map((task) => ({
      id: task.id,
      title: task.title,
      priority:
        task.priority === "critical" || task.priority === "high"
          ? "alta"
          : task.priority === "medium"
            ? "media"
            : "baja",
      status:
        task.columnId === "done"
          ? "completado"
          : task.columnId === "in_progress"
            ? "en_proceso"
            : "pendiente",
      dueTime: new Date(task.dueAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      hasChecklist: Boolean(task.requiresChecklist),
      overdue: task.columnId !== "done" && new Date(task.dueAt).getTime() < Date.now(),
    }));
}

function buildWeeklyActivity(payload: RuntimeSyncPayload) {
  return payload.weekly.map((entry) => ({
    day: entry.day.charAt(0),
    completed: entry.completed,
    total: Math.max(entry.completed + entry.overdue, entry.completed + 1),
  }));
}

function buildAlertsForUser(user: User, payload: RuntimeSyncPayload) {
  const taskIds = new Set(payload.tasks.filter((task) => task.assigneeId === user.id).map((task) => task.id));
  return payload.alerts
    .filter((alert) => !alert.relatedTaskId || taskIds.has(alert.relatedTaskId))
    .slice(0, 6)
    .map((alert) => ({
      id: alert.id,
      title: alert.title,
      description: alert.body,
      severity: alert.severity === "critical" ? "alta" : "info",
      time: new Date(alert.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
      read: alert.read,
    }));
}

function buildTransactions(userId: string, payload: RuntimeSyncPayload) {
  return getUserFinanceMovements(userId, payload.financeMovements).slice(0, 8).map((movement) => ({
    id: movement.id,
    type:
      movement.type === "payment"
        ? "pago"
        : movement.type === "bonus" || movement.type === "cashback"
          ? "bono"
          : "credito",
    title: movement.title,
    amount: movement.amount,
    date: new Date(movement.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }),
    status:
      movement.status === "pending"
        ? "activo"
        : movement.status === "scheduled"
          ? "programado"
          : "completado",
  }));
}

function buildAchievements(user: User, payload: RuntimeSyncPayload) {
  const snapshot = getUserScoreSnapshot(user.id, payload.scoreSnapshots);
  const tasks = buildTasksForUser(user, payload);
  return [
    { id: 1, title: "Semana perfecta", desc: "7 dias sin tareas vencidas", icon: "star", color: "#F59E0B", earned: tasks.every((task) => !task.overdue) },
    { id: 2, title: "Primer credito", desc: "Solicitud aprobada", icon: "card", color: "#10B981", earned: getUserFinanceApplications(user.id, payload.financeApplications).some((application) => application.status === "approved" || application.status === "disbursed") },
    { id: 3, title: "Consistente", desc: "Racha operativa activa", icon: "repeat", color: "#22D3EE", earned: (snapshot?.consistency ?? 0) >= 80 },
    { id: 4, title: "Score 70+", desc: "Nivel desbloqueado", icon: "trending-up", color: "#8B5CF6", earned: (snapshot?.score ?? 0) >= 70 },
  ];
}

export async function authenticateMobileUser(email: string, password: string, systemMode: SystemMode) {
  const payload = await getRuntimeSyncPayload(systemMode);
  const user = payload.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());

  if (!user || user.password !== password) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    systemMode,
  };
}

export async function buildMobileSession(userId: string, systemMode: SystemMode) {
  const payload = await getRuntimeSyncPayload(systemMode);
  const user = payload.users.find((entry) => entry.id === userId);

  if (!user) {
    return null;
  }

  const scoreSnapshot = getUserScoreSnapshot(user.id, payload.scoreSnapshots);
  const financeAccounts = getUserFinanceAccounts(user.id, payload.financeAccounts);
  const financeApplications = getUserFinanceApplications(user.id, payload.financeApplications);
  const financeInsights = getVisibleFinanceInsights(user, payload.financeInsights, payload.financeApplications);
  const financeProducts = getFinanceProductsForUser(user.id, payload.scoreSnapshots);

  return {
    currentUser: {
      id: user.id,
      name: user.name,
      role:
        user.role === "operator"
          ? "Operador"
          : user.role === "supervisor"
            ? "Supervisor"
            : user.role === "owner"
              ? "Owner"
              : "Admin",
      sede: user.site,
      avatar: user.avatar,
      score: scoreSnapshot?.score ?? 0,
      email: user.email,
      statusLabel: user.statusLabel,
    },
    scoreBreakdown: scoreBreakdownFromSnapshot(scoreSnapshot),
    scoreHistory: scoreHistoryFromSnapshot(scoreSnapshot),
    teamScores: buildTeamScores(user, payload),
    myTasks: buildTasksForUser(user, payload),
    weeklyActivity: buildWeeklyActivity(payload),
    creditProducts: financeProducts.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      maxAmount: product.maxAmount,
      rate: product.rateLabel,
      term: product.termLabel,
      icon: product.icon,
      available: product.unlocked,
      requiredScore: product.requiredScore,
      color: product.accent,
    })),
    transactions: buildTransactions(user.id, payload),
    alerts: buildAlertsForUser(user, payload),
    applications: financeApplications,
    financeInsights,
    accountSummary: {
      availableBalance: financeAccounts.reduce((sum, account) => sum + account.availableBalance, 0),
      pendingBalance: financeAccounts.reduce((sum, account) => sum + account.pendingBalance, 0),
      creditLimit: financeAccounts.reduce((sum, account) => sum + (account.creditLimit ?? 0), 0),
      activeApplications: financeApplications.filter((application) => application.status !== "rejected").length,
    },
    achievements: buildAchievements(user, payload),
    apiMeta: {
      generatedAt: new Date().toISOString(),
      systemMode,
    },
  };
}

function computePaymentPerPeriod(amount: number, productId: string) {
  if (productId === "salary_advance") {
    return amount;
  }
  if (productId === "shield_plus") {
    return 89;
  }
  if (productId === "tooling_credit") {
    return Math.round(amount / 10);
  }
  return Math.round(amount / 6);
}

function findProduct(productId: string) {
  return financeProductCatalog.find((product) => product.id === productId) ?? null;
}

export async function submitMobileCreditApplication({
  userId,
  amount,
  productId,
  rationale,
  systemMode,
}: {
  userId: string;
  amount: number;
  productId: string;
  rationale: string;
  systemMode: SystemMode;
}) {
  const payload = await getRuntimeSyncPayload(systemMode);
  const user = payload.users.find((entry) => entry.id === userId);
  const snapshot = payload.scoreSnapshots.find((entry) => entry.userId === userId);
  const product = findProduct(productId);

  if (!user || !snapshot || !product) {
    return { ok: false, message: "No se pudo validar la solicitud." };
  }

  if (snapshot.score < product.requiredScore) {
    return {
      ok: false,
      message: `No alcanza el score requerido. Faltan ${product.requiredScore - snapshot.score} puntos.`,
    };
  }

  if (product.maxAmount > 0 && amount > product.maxAmount) {
    return { ok: false, message: `El maximo permitido para ${product.name} es ${formatFinanceMoney(product.maxAmount)}.` };
  }

  const status: FinanceApplication["status"] = snapshot.score >= Math.max(product.requiredScore + 12, 82) ? "approved" : "under_review";
  const requestedAt = new Date().toISOString();
  const application: FinanceApplication = {
    id: crypto.randomUUID(),
    userId,
    productId,
    productName: product.name,
    requestedAmount: amount,
    status,
    requestedAt,
    updatedAt: requestedAt,
    paymentPerPeriod: computePaymentPerPeriod(amount, productId),
    termLabel: product.termLabel,
    rationale,
    aiSummary:
      status === "approved"
        ? "Capataz aprueba en automatico por score robusto, actividad estable y baja friccion operativa."
        : "Capataz envia a revision porque el score es suficiente pero el contexto operativo todavia tiene focos amarillos.",
  };

  const insight: FinanceInsight = {
    id: crypto.randomUUID(),
    userId,
    title: `Solicitud de ${product.name}`,
    body: `${user.name} solicito ${formatFinanceMoney(amount)}. ${application.aiSummary}`,
    tone: status === "approved" ? "positive" : "warning",
    createdAt: requestedAt,
  };

  const account = payload.financeAccounts.find((entry) => entry.userId === userId && entry.kind === "wallet");
  const reserveMovement =
    account && status === "under_review"
      ? {
          id: crypto.randomUUID(),
          userId,
          accountId: account.id,
          type: "reserve" as const,
          status: "pending" as const,
          title: `Reserva ${product.name}`,
          detail: "Solicitud enviada desde app movil",
          amount: -Math.min(amount * 0.1, 500),
          createdAt: requestedAt,
        }
      : null;

  await replaceRuntimeSyncPayload({
    ...payload,
    financeApplications: [application, ...payload.financeApplications],
    financeInsights: [insight, ...payload.financeInsights].slice(0, 30),
    financeMovements: reserveMovement ? [reserveMovement, ...payload.financeMovements] : payload.financeMovements,
  });

  return {
    ok: true,
    status,
    applicationId: application.id,
    message:
      status === "approved"
        ? `Solicitud aprobada por ${formatFinanceMoney(amount)}.`
        : `Solicitud enviada a revision por ${formatFinanceMoney(amount)}.`,
  };
}

