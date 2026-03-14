import type { ActivityEntry, ChecklistInstance, ScoreSnapshot, Task, User } from "@/lib/types";
import { isOverdue } from "@/lib/utils";

export function computeScore(snapshot: Omit<ScoreSnapshot, "score" | "trend" | "note">) {
  return Number(
    (
      snapshot.compliance * 0.35 +
      snapshot.speed * 0.25 +
      snapshot.consistency * 0.25 +
      snapshot.activity * 0.15
    ).toFixed(1),
  );
}

export function scoreBand(score: number) {
  if (score >= 85) return "alto";
  if (score >= 70) return "medio";
  return "bajo";
}

function clampScore(value: number) {
  return Number(Math.min(100, Math.max(0, value)).toFixed(1));
}

function buildScoreNote({
  score,
  trend,
  overdue,
  blocked,
}: {
  score: number;
  trend: ScoreSnapshot["trend"];
  overdue: number;
  blocked: number;
}) {
  if (overdue > 0) {
    return "Tiene atrasos abiertos y necesita recuperar ritmo de cierre.";
  }
  if (blocked > 0) {
    return "Mantiene avance, pero aun carga bloqueos que presionan consistencia.";
  }
  if (trend === "up" && score >= 85) {
    return "Sostiene ejecucion limpia y viene mejorando frente al corte anterior.";
  }
  if (trend === "down") {
    return "Perdio traccion frente al corte anterior y conviene intervenir pronto.";
  }
  if (score >= 85) {
    return "Opera con buen nivel de cumplimiento y variacion controlada.";
  }
  if (score >= 70) {
    return "Cumple con margen aceptable, aunque todavia hay friccion operativa.";
  }
  return "Necesita acompanamiento cercano para recuperar disciplina operativa.";
}

export function recomputeScoreSnapshots({
  users,
  tasks,
  checklists,
  activity,
  previousSnapshots,
}: {
  users: User[];
  tasks: Task[];
  checklists: ChecklistInstance[];
  activity: ActivityEntry[];
  previousSnapshots: ScoreSnapshot[];
}) {
  const scorableUsers = users.filter((user) => user.role === "supervisor" || user.role === "operator");

  return scorableUsers.map((user) => {
    const userTasks = tasks.filter((task) => task.assigneeId === user.id);
    const completedTasks = userTasks.filter((task) => task.columnId === "done");
    const blockedTasks = userTasks.filter((task) => task.columnId === "blocked");
    const overdueTasks = userTasks.filter((task) => task.columnId !== "done" && isOverdue(task.dueAt));
    const onTimeCompletedTasks = completedTasks.filter(
      (task) => !task.completedAt || new Date(task.completedAt).getTime() <= new Date(task.dueAt).getTime(),
    );
    const userChecklists = checklists.filter((checklist) => checklist.assigneeId === user.id);
    const allItems = userChecklists.flatMap((checklist) => checklist.items);
    const requiredItems = allItems.filter((item) => item.required);
    const completedItems = allItems.filter((item) => item.done);
    const completedRequiredItems = requiredItems.filter((item) => item.done);
    const userActivity = activity.filter((entry) => entry.actorId === user.id);

    const completionRate = userTasks.length ? completedTasks.length / userTasks.length : 0;
    const onTimeRate = completedTasks.length ? onTimeCompletedTasks.length / completedTasks.length : 1;
    const checklistCompletionRate = allItems.length ? completedItems.length / allItems.length : completionRate;
    const requiredCompletionRate = requiredItems.length ? completedRequiredItems.length / requiredItems.length : 1;
    const activityRate = Math.min(userActivity.length, 8) / 8;

    const compliance = clampScore(requiredCompletionRate * 70 + onTimeRate * 30 - overdueTasks.length * 6);
    const speed = clampScore(completionRate * 55 + onTimeRate * 45 - overdueTasks.length * 8);
    const consistency = clampScore(100 - blockedTasks.length * 12 - overdueTasks.length * 10 + completionRate * 8);
    const activityScore = clampScore(checklistCompletionRate * 70 + activityRate * 30);

    const score = computeScore({
      compliance,
      speed,
      consistency,
      activity: activityScore,
      userId: user.id,
    });
    const previousScore = previousSnapshots.find((snapshot) => snapshot.userId === user.id)?.score ?? score;
    const delta = score - previousScore;
    const trend = delta >= 1 ? "up" : delta <= -1 ? "down" : "steady";

    return {
      userId: user.id,
      compliance,
      speed,
      consistency,
      activity: activityScore,
      score,
      trend,
      note: buildScoreNote({
        score,
        trend,
        overdue: overdueTasks.length,
        blocked: blockedTasks.length,
      }),
    } satisfies ScoreSnapshot;
  });
}
