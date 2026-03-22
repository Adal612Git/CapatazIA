import type {
  FinanceAccount,
  FinanceApplication,
  FinanceInsight,
  FinanceMovement,
  ScoreSnapshot,
  User,
} from "@/lib/types";

export interface FinanceProductDefinition {
  id: string;
  name: string;
  description: string;
  maxAmount: number;
  rateLabel: string;
  termLabel: string;
  requiredScore: number;
  accent: string;
  icon: string;
  category: "advance" | "credit" | "insurance" | "rewards";
}

export const financeProductCatalog: FinanceProductDefinition[] = [
  {
    id: "salary_advance",
    name: "Adelanto de nomina",
    description: "Liquidez inmediata ligada a desempeno y puntualidad operativa.",
    maxAmount: 4500,
    rateLabel: "0%",
    termLabel: "Quincena",
    requiredScore: 50,
    accent: "#2ec5ff",
    icon: "wallet",
    category: "advance",
  },
  {
    id: "micro_credit",
    name: "Microcredito personal",
    description: "Linea corta para imprevistos con scoring y monitoreo continuo.",
    maxAmount: 12000,
    rateLabel: "2.3% mensual",
    termLabel: "6 meses",
    requiredScore: 62,
    accent: "#7b67ff",
    icon: "coins",
    category: "credit",
  },
  {
    id: "tooling_credit",
    name: "Credito herramientas",
    description: "Financia equipo, uniformes o smartphone de trabajo sin friccion.",
    maxAmount: 18000,
    rateLabel: "1.6% mensual",
    termLabel: "10 meses",
    requiredScore: 74,
    accent: "#31d08b",
    icon: "briefcase-business",
    category: "credit",
  },
  {
    id: "shield_plus",
    name: "Seguro operativo",
    description: "Cobertura para incidentes y asistencia con cobro recurrente ligero.",
    maxAmount: 0,
    rateLabel: "$89/mes",
    termLabel: "Mensual",
    requiredScore: 0,
    accent: "#ffb347",
    icon: "shield",
    category: "insurance",
  },
];

export function formatFinanceMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getUserScoreSnapshot(userId: string, scoreSnapshots: ScoreSnapshot[]) {
  return scoreSnapshots.find((snapshot) => snapshot.userId === userId) ?? null;
}

export function getFinanceProductsForUser(userId: string, scoreSnapshots: ScoreSnapshot[]) {
  const score = getUserScoreSnapshot(userId, scoreSnapshots)?.score ?? 0;
  return financeProductCatalog.map((product) => ({
    ...product,
    unlocked: score >= product.requiredScore,
    scoreGap: Math.max(product.requiredScore - score, 0),
  }));
}

export function getUserFinanceAccounts(userId: string, financeAccounts: FinanceAccount[]) {
  return financeAccounts.filter((account) => account.userId === userId);
}

export function getUserFinanceMovements(userId: string, financeMovements: FinanceMovement[]) {
  return financeMovements
    .filter((movement) => movement.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getUserFinanceApplications(userId: string, financeApplications: FinanceApplication[]) {
  return financeApplications
    .filter((application) => application.userId === userId)
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

export function getVisibleFinanceInsights(
  user: User | null,
  financeInsights: FinanceInsight[],
  financeApplications: FinanceApplication[],
) {
  if (!user) {
    return [];
  }

  const scopedInsights =
    user.role === "admin" || user.role === "owner" || user.role === "supervisor"
      ? financeInsights
      : financeInsights.filter((insight) => !insight.userId || insight.userId === user.id);

  const latestApplication = getUserFinanceApplications(user.id, financeApplications)[0];

  if (!latestApplication) {
    return scopedInsights;
  }

  const applicationInsight: FinanceInsight = {
    id: `application-${latestApplication.id}`,
    userId: latestApplication.userId,
    title: `Solicitud ${latestApplication.status.replace(/_/g, " ")}`,
    body: `${latestApplication.productName} por ${formatFinanceMoney(latestApplication.requestedAmount)}. ${latestApplication.aiSummary}`,
    tone:
      latestApplication.status === "rejected"
        ? "critical"
        : latestApplication.status === "under_review"
          ? "warning"
          : "positive",
    createdAt: latestApplication.updatedAt,
  };

  return [applicationInsight, ...scopedInsights].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function buildFinanceTrend(financeMovements: FinanceMovement[]) {
  const monthly = new Map<string, { label: string; inflow: number; outflow: number }>();

  financeMovements.forEach((movement) => {
    const date = new Date(movement.createdAt);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("es-MX", { month: "short" });
    const entry = monthly.get(monthKey) ?? { label, inflow: 0, outflow: 0 };
    if (movement.amount >= 0) {
      entry.inflow += movement.amount;
    } else {
      entry.outflow += Math.abs(movement.amount);
    }
    monthly.set(monthKey, entry);
  });

  return [...monthly.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-6)
    .map(([, value]) => value);
}

export function buildFinanceTeamSnapshot(
  users: User[],
  scoreSnapshots: ScoreSnapshot[],
  financeAccounts: FinanceAccount[],
  financeApplications: FinanceApplication[],
) {
  return users
    .filter((user) => user.role !== "admin")
    .map((user) => {
      const accountBalance = getUserFinanceAccounts(user.id, financeAccounts).reduce(
        (sum, account) => sum + account.availableBalance + account.pendingBalance,
        0,
      );
      const activeApplications = getUserFinanceApplications(user.id, financeApplications).filter(
        (application) => application.status === "under_review" || application.status === "approved" || application.status === "disbursed",
      ).length;
      const score = getUserScoreSnapshot(user.id, scoreSnapshots)?.score ?? 0;

      return {
        userId: user.id,
        name: user.name,
        role: user.role,
        site: user.site,
        score,
        balance: accountBalance,
        activeApplications,
      };
    })
    .sort((left, right) => right.score - left.score || right.balance - left.balance);
}

