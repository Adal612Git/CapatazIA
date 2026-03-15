"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { taskEditSchema, taskInputSchema } from "@/lib/contracts";
import {
  canCreateTasks,
  canEditTask,
  canManageBellIncident,
  canManageCommercialEntityByScope,
  canManageCreditFile,
  canManagePostSaleFollowUp,
  canManageProspect,
  canManageSalesOperation,
  canManageTestDrive,
  canMoveTask,
  canToggleChecklist,
} from "@/lib/permissions";
import {
  hydrateBellIncidents,
  hydrateCreditFiles,
  hydratePostSaleFollowUps,
  hydrateProspects,
  hydrateRuntimePayload,
  hydrateSalesOperations,
  hydrateScheduledBroadcasts,
  hydrateTestDrives,
  hydrateUsers,
} from "@/lib/runtime-hydration";
import { recomputeScoreSnapshots } from "@/lib/score";
import { seedData } from "@/lib/seed-data";
import type {
  ActivityEntry,
  Alert,
  BellIncident,
  ChecklistInstance,
  Column,
  CreditFile,
  GeneratedReport,
  OperationalNote,
  OperationalSuggestion,
  PostSaleFollowUp,
  Prospect,
  RuntimeSyncPayload,
  SalesOperation,
  ScheduledBroadcast,
  ScoreSnapshot,
  Task,
  TaskInput,
  TestDrive,
  User,
  WeeklyPoint,
  Workspace,
} from "@/lib/types";

interface AppState {
  workspace: Workspace;
  users: User[];
  columns: Column[];
  tasks: Task[];
  checklists: ChecklistInstance[];
  alerts: Alert[];
  activity: ActivityEntry[];
  prospects: Prospect[];
  testDrives: TestDrive[];
  salesOperations: SalesOperation[];
  creditFiles: CreditFile[];
  bellIncidents: BellIncident[];
  postSaleFollowUps: PostSaleFollowUp[];
  scheduledBroadcasts: ScheduledBroadcast[];
  runtimeReports: GeneratedReport[];
  runtimeNotes: OperationalNote[];
  runtimeSuggestions: OperationalSuggestion[];
  scoreSnapshots: ScoreSnapshot[];
  weekly: WeeklyPoint[];
  sessionUserId: string | null;
  selectedTaskId: string | null;
  hydrated: boolean;
  initialize: () => void;
  setHydrated: (value: boolean) => void;
  syncRuntimeFromServer: () => Promise<void>;
  pushRuntimeToServer: () => Promise<void>;
  login: (email: string, password: string) => { ok: boolean; message?: string };
  logout: () => void;
  selectTask: (taskId: string | null) => void;
  createTask: (input: TaskInput, actorId: string) => { ok: boolean; message?: string };
  moveTask: (taskId: string, columnId: string, actorId: string, options?: { blockedReason?: string }) => { ok: boolean; message?: string };
  updateTask: (taskId: string, patch: Partial<Task>, actorId: string) => { ok: boolean; message?: string };
  toggleChecklistItem: (checklistId: string, itemId: string, actorId: string) => { ok: boolean; message?: string };
  createProspect: (
    input: Pick<Prospect, "customerName" | "salespersonId" | "agency" | "source" | "vehicleInterest" | "financingRequired" | "notes"> & {
      nextActionAt?: string;
    },
    actorId: string,
  ) => { ok: boolean; message?: string };
  advanceProspectStatus: (prospectId: string, status: Prospect["status"], actorId: string) => void;
  scheduleTestDrive: (prospectId: string, scheduledAt: string, actorId: string) => void;
  updateTestDriveStatus: (testDriveId: string, status: TestDrive["status"], actorId: string) => void;
  createSalesOperationFromProspect: (prospectId: string, actorId: string) => { ok: boolean; message?: string };
  updateSalesOperationStage: (operationId: string, stage: SalesOperation["stage"], actorId: string) => void;
  updateSalesOperation: (
    operationId: string,
    patch: Partial<Pick<SalesOperation, "closingProbability" | "expectedCloseAt" | "nextStep" | "notes" | "subsidyType" | "subsidyAmount">>,
    actorId: string,
  ) => void;
  createCreditFileForOperation: (operationId: string, actorId: string) => { ok: boolean; message?: string };
  updateCreditFileStatus: (creditFileId: string, status: CreditFile["status"], actorId: string) => void;
  toggleCreditDocument: (creditFileId: string, documentName: string, actorId: string) => void;
  updateBellIncident: (incidentId: string, status: BellIncident["status"], actorId: string, resolutionNote?: string) => void;
  updatePostSaleFollowUp: (followUpId: string, status: PostSaleFollowUp["status"], actorId: string) => void;
  updateScheduledBroadcast: (
    broadcastId: string,
    patch: Partial<Pick<ScheduledBroadcast, "title" | "message" | "audioLabel" | "audience" | "frequency" | "timeOfDay" | "timezone" | "active">>,
    actorId: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  runScheduledBroadcastNow: (broadcastId: string, actorId: string) => Promise<{ ok: boolean; message?: string }>;
  markAlertRead: (alertId: string) => void;
  addColumn: (title: string, color: string) => void;
}

function appendActivity(activity: ActivityEntry[], actorId: string, message: string) {
  return [
    {
      id: crypto.randomUUID(),
      actorId,
      message,
      createdAt: new Date().toISOString(),
    },
    ...activity,
  ];
}

function recalculateChecklistStatus(checklist: ChecklistInstance): ChecklistInstance {
  const allRequiredDone = checklist.items.every((item) => !item.required || item.done);
  const anyDone = checklist.items.some((item) => item.done);

  return {
    ...checklist,
    status: allRequiredDone ? "complete" : anyDone ? "in_progress" : "pending",
  };
}

function prospectStatusToOperationStage(status: Prospect["status"]): SalesOperation["stage"] {
  switch (status) {
    case "test_drive":
      return "test_drive";
    case "negotiation":
      return "negotiation";
    case "closed_won":
      return "closed_won";
    case "closed_lost":
      return "closed_lost";
    default:
      return "prospecting";
  }
}

function operationStageToProspectStatus(stage: SalesOperation["stage"]): Prospect["status"] {
  switch (stage) {
    case "test_drive":
      return "test_drive";
    case "negotiation":
    case "credit_review":
    case "ready_to_close":
      return "negotiation";
    case "closed_won":
      return "closed_won";
    case "closed_lost":
      return "closed_lost";
    default:
      return "follow_up";
  }
}

function creditRequiredDocuments() {
  return ["Solicitud firmada", "INE", "Comprobante de domicilio", "Estados de cuenta"];
}

function buildPostSaleFollowUpFromOperation(operation: SalesOperation): PostSaleFollowUp {
  const dueAt = new Date(operation.closedAt ?? operation.updatedAt);
  dueAt.setDate(dueAt.getDate() + 5);

  return {
    id: crypto.randomUUID(),
    groupId: operation.groupId,
    brandId: operation.brandId,
    siteId: operation.siteId,
    customerName: operation.customerName,
    vehicleModel: operation.vehicleModel,
    salespersonId: operation.salespersonId,
    agency: operation.agency,
    saleDate: operation.closedAt ?? operation.updatedAt,
    dueAt: dueAt.toISOString(),
    status: "pending",
    nextStep: "Llamar a cliente, validar experiencia y agendar siguiente contacto post-venta.",
  };
}

function syncProspectWithOperation(prospects: Prospect[], operation: SalesOperation) {
  return prospects.map((prospect) =>
    prospect.id === operation.prospectId
      ? {
          ...prospect,
          status: operationStageToProspectStatus(operation.stage),
          nextActionAt: operation.expectedCloseAt,
          notes: operation.notes || prospect.notes,
        }
      : prospect,
  );
}

function syncOperationWithProspect(operations: SalesOperation[], prospect: Prospect) {
  return operations.map((operation) =>
    operation.prospectId === prospect.id
      ? {
          ...operation,
          stage: prospectStatusToOperationStage(prospect.status),
          updatedAt: new Date().toISOString(),
          nextStep: prospect.nextActionAt ? `Siguiente accion registrada para ${prospect.nextActionAt}.` : operation.nextStep,
        }
      : operation,
  );
}

function buildChecklistFromInput(input: TaskInput, taskId: string, checklistId: string): ChecklistInstance {
  const isCritical = input.priority === "critical" || input.priority === "high";
  const templateName = isCritical ? "Checklist de ejecucion critica" : "Checklist operativo de campo";
  const evidenceLabel = input.tags.some((tag) => tag.toLowerCase().includes("evidencia"))
    ? "Validar evidencia etiquetada"
    : "Subir evidencia del trabajo";

  return {
    id: checklistId,
    taskId,
    templateName,
    assigneeId: input.assigneeId,
    status: "pending",
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

function refreshScoreSnapshots(state: Pick<AppState, "users" | "tasks" | "checklists" | "activity" | "scoreSnapshots">) {
  return recomputeScoreSnapshots({
    users: state.users,
    tasks: state.tasks,
    checklists: state.checklists,
    activity: state.activity,
    previousSnapshots: state.scoreSnapshots,
  });
}

function buildRuntimeSyncSignature(
  state: Pick<
    AppState,
    | "users"
    | "tasks"
    | "checklists"
    | "alerts"
    | "activity"
    | "prospects"
    | "testDrives"
    | "salesOperations"
    | "creditFiles"
    | "bellIncidents"
    | "postSaleFollowUps"
    | "scheduledBroadcasts"
    | "runtimeReports"
    | "runtimeNotes"
    | "runtimeSuggestions"
  >,
) {
  return JSON.stringify({
    users: state.users,
    tasks: state.tasks,
    checklists: state.checklists,
    alerts: state.alerts,
    activity: state.activity,
    prospects: state.prospects,
    testDrives: state.testDrives,
    salesOperations: state.salesOperations,
    creditFiles: state.creditFiles,
    bellIncidents: state.bellIncidents,
    postSaleFollowUps: state.postSaleFollowUps,
    scheduledBroadcasts: state.scheduledBroadcasts,
    runtimeReports: state.runtimeReports,
    runtimeNotes: state.runtimeNotes,
    runtimeSuggestions: state.runtimeSuggestions,
  });
}

async function fetchRuntimePayload() {
  const response = await fetch("/api/capataz/runtime", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudo leer el runtime de Capataz");
  }

  return (await response.json()) as RuntimeSyncPayload;
}

async function pushRuntimePayload(payload: RuntimeSyncPayload) {
  const response = await fetch("/api/capataz/runtime", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("No se pudo sincronizar el runtime de Capataz");
  }
}

async function runBroadcastNowRequest(broadcastId: string) {
  const response = await fetch(`/api/capataz/broadcasts/${broadcastId}/run`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("No se pudo ejecutar el broadcast");
  }

  return (await response.json()) as { ok: boolean; delivered: number };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seedData,
      runtimeReports: [],
      runtimeNotes: [],
      runtimeSuggestions: [],
      prospects: seedData.prospects,
      testDrives: seedData.testDrives,
      salesOperations: seedData.salesOperations,
      creditFiles: seedData.creditFiles,
      bellIncidents: seedData.bellIncidents,
      postSaleFollowUps: seedData.postSaleFollowUps,
      scheduledBroadcasts: seedData.scheduledBroadcasts,
      sessionUserId: null,
      selectedTaskId: null,
      hydrated: false,
      initialize: () => {
        set((state) => {
          const hydratedUsers = state.users?.length ? hydrateUsers(state.users) : seedData.users;
          const nextState = {
            ...state,
            workspace: state.workspace ?? seedData.workspace,
            users: hydratedUsers,
            columns: state.columns?.length ? state.columns : seedData.columns,
            tasks: state.tasks?.length ? state.tasks : seedData.tasks,
            checklists: state.checklists?.length ? state.checklists : seedData.checklists,
            alerts: state.alerts?.length ? state.alerts : seedData.alerts,
            activity: state.activity?.length ? state.activity : seedData.activity,
            prospects: hydrateProspects(state.prospects?.length ? state.prospects : seedData.prospects),
            testDrives: hydrateTestDrives(state.testDrives?.length ? state.testDrives : seedData.testDrives),
            salesOperations: hydrateSalesOperations(state.salesOperations?.length ? state.salesOperations : seedData.salesOperations),
            creditFiles: hydrateCreditFiles(state.creditFiles?.length ? state.creditFiles : seedData.creditFiles),
            bellIncidents: hydrateBellIncidents(state.bellIncidents?.length ? state.bellIncidents : seedData.bellIncidents),
            postSaleFollowUps: hydratePostSaleFollowUps(
              state.postSaleFollowUps?.length ? state.postSaleFollowUps : seedData.postSaleFollowUps,
            ),
            scheduledBroadcasts: hydrateScheduledBroadcasts(
              state.scheduledBroadcasts?.length ? state.scheduledBroadcasts : seedData.scheduledBroadcasts,
            ),
            runtimeReports: state.runtimeReports ?? [],
            runtimeNotes: state.runtimeNotes ?? [],
            runtimeSuggestions: state.runtimeSuggestions ?? [],
            scoreSnapshots: state.scoreSnapshots?.length ? state.scoreSnapshots : seedData.scoreSnapshots,
            weekly: state.weekly?.length ? state.weekly : seedData.weekly,
          };

          return {
            ...nextState,
            scoreSnapshots: refreshScoreSnapshots(nextState),
          };
        });
      },
      setHydrated: (value) => set({ hydrated: value }),
      syncRuntimeFromServer: async () => {
        const payload = hydrateRuntimePayload(await fetchRuntimePayload());
        set((state) => {
          const nextSignature = buildRuntimeSyncSignature({
            users: payload.users,
            tasks: payload.tasks,
            checklists: payload.checklists,
            alerts: payload.alerts,
            activity: payload.activity,
            prospects: payload.prospects,
            testDrives: payload.testDrives,
            salesOperations: payload.salesOperations,
            creditFiles: payload.creditFiles,
            bellIncidents: payload.bellIncidents,
            postSaleFollowUps: payload.postSaleFollowUps,
            scheduledBroadcasts: payload.scheduledBroadcasts,
            runtimeReports: payload.reports,
            runtimeNotes: payload.notes,
            runtimeSuggestions: payload.suggestions,
          });
          const currentSignature = buildRuntimeSyncSignature(state);

          if (currentSignature === nextSignature) {
            return state;
          }

          const nextState = {
            ...state,
            users: payload.users,
            tasks: payload.tasks,
            checklists: payload.checklists,
            alerts: payload.alerts,
            activity: payload.activity,
            prospects: payload.prospects,
            testDrives: payload.testDrives,
            salesOperations: payload.salesOperations,
            creditFiles: payload.creditFiles,
            bellIncidents: payload.bellIncidents,
            postSaleFollowUps: payload.postSaleFollowUps,
            scheduledBroadcasts: payload.scheduledBroadcasts,
            runtimeReports: payload.reports,
            runtimeNotes: payload.notes,
            runtimeSuggestions: payload.suggestions,
          };

          return {
            ...nextState,
            scoreSnapshots: refreshScoreSnapshots(nextState),
          };
        });
      },
      pushRuntimeToServer: async () => {
        const state = get();
        await pushRuntimePayload({
          users: state.users,
          tasks: state.tasks,
          checklists: state.checklists,
          alerts: state.alerts,
          activity: state.activity,
          prospects: state.prospects,
          testDrives: state.testDrives,
          salesOperations: state.salesOperations,
          creditFiles: state.creditFiles,
          bellIncidents: state.bellIncidents,
          postSaleFollowUps: state.postSaleFollowUps,
          scheduledBroadcasts: state.scheduledBroadcasts,
          reports: state.runtimeReports,
          notes: state.runtimeNotes,
          suggestions: state.runtimeSuggestions,
        });
      },
      login: (email, password) => {
        const user = get().users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
        if (!user || user.password !== password) {
          return { ok: false, message: "Credenciales invalidas" };
        }

        const nextActivity = appendActivity(get().activity, user.id, "Inicio sesion en el dashboard operativo");
        set({
          sessionUserId: user.id,
          activity: nextActivity,
          scoreSnapshots: refreshScoreSnapshots({
            users: get().users,
            tasks: get().tasks,
            checklists: get().checklists,
            activity: nextActivity,
            scoreSnapshots: get().scoreSnapshots,
          }),
        });
        void get().pushRuntimeToServer();
        return { ok: true };
      },
      logout: () => set({ sessionUserId: null, selectedTaskId: null }),
      selectTask: (taskId) => set({ selectedTaskId: taskId }),
      createTask: (input, actorId) => {
        const state = get();
        const actor = state.users.find((entry) => entry.id === actorId);
        if (!actor) {
          return { ok: false, message: "No se encontro el usuario que intenta crear la tarea" };
        }
        if (!canCreateTasks(actor.role)) {
          return { ok: false, message: "Tu rol no puede crear tareas nuevas" };
        }

        const parsed = taskInputSchema.safeParse(input);
        if (!parsed.success) {
          return { ok: false, message: parsed.error.issues[0]?.message ?? "Payload invalido" };
        }
        if (!state.users.some((entry) => entry.id === input.assigneeId)) {
          return { ok: false, message: "El responsable seleccionado no existe" };
        }
        const pendingColumn = state.columns.find((column) => column.id === "pending");
        const pendingCount = state.tasks.filter((task) => task.columnId === "pending").length;
        if (pendingColumn?.limit && pendingCount >= pendingColumn.limit) {
          return { ok: false, message: `La columna Pendiente ya alcanzo su limite WIP de ${pendingColumn.limit}` };
        }

        const taskId = crypto.randomUUID();
        const checklistId = input.requiresChecklist ? crypto.randomUUID() : undefined;
        const task: Task = {
          id: taskId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          columnId: "pending",
          assigneeId: input.assigneeId,
          reporterId: actorId,
          dueAt: input.dueAt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          location: input.location,
          tags: input.tags,
          requiresChecklist: input.requiresChecklist,
          checklistInstanceId: checklistId,
        };

        const checklist = checklistId ? buildChecklistFromInput(input, taskId, checklistId) : null;

        set((state) => ({
          ...(() => {
            const nextTasks = [task, ...state.tasks];
            const nextChecklists = checklist ? [checklist, ...state.checklists] : state.checklists;
            const nextActivity = appendActivity(state.activity, actorId, `Creo la tarea "${task.title}"`);
            return {
              tasks: nextTasks,
              checklists: nextChecklists,
              activity: nextActivity,
              scoreSnapshots: refreshScoreSnapshots({
                users: state.users,
                tasks: nextTasks,
                checklists: nextChecklists,
                activity: nextActivity,
                scoreSnapshots: state.scoreSnapshots,
              }),
            };
          })(),
        }));

        void get().pushRuntimeToServer();

        return { ok: true };
      },
      moveTask: (taskId, columnId, actorId, options) => {
        const state = get();
        const task = state.tasks.find((entry) => entry.id === taskId);
        if (!task) {
          return { ok: false, message: "La tarea no existe" };
        }
        const actor = state.users.find((entry) => entry.id === actorId);
        if (!actor) {
          return { ok: false, message: "No se encontro el usuario que intenta mover la tarea" };
        }
        if (!canMoveTask(actor, task, state.users)) {
          return { ok: false, message: "Tu rol no puede mover esta tarea" };
        }
        const targetColumn = state.columns.find((entry) => entry.id === columnId);
        if (!targetColumn) {
          return { ok: false, message: "La columna destino no existe" };
        }
        if (task.columnId !== columnId && targetColumn.limit) {
          const nextCount = state.tasks.filter((entry) => entry.columnId === columnId).length;
          if (nextCount >= targetColumn.limit) {
            return { ok: false, message: `La columna ${targetColumn.title} ya alcanzo su limite WIP de ${targetColumn.limit}` };
          }
        }
        const blockedReason = options?.blockedReason?.trim();
        if (columnId === "blocked" && !blockedReason && !task.blockedReason) {
          return { ok: false, message: "Captura un motivo real antes de bloquear la tarea" };
        }

        if (columnId === "done" && task.requiresChecklist) {
          const checklist = state.checklists.find((entry) => entry.id === task.checklistInstanceId);
          const checklistComplete = checklist?.items.every((item) => !item.required || item.done);
          if (!checklistComplete) {
            const warning: Alert = {
              id: crypto.randomUUID(),
              title: "Intento de cierre bloqueado",
              body: `No se puede cerrar "${task.title}" hasta completar el checklist requerido.`,
              severity: "critical",
              read: false,
              createdAt: new Date().toISOString(),
              relatedTaskId: task.id,
            };

            set((current) => ({
              alerts: [warning, ...current.alerts],
              activity: appendActivity(current.activity, actorId, `Intento cerrar "${task.title}" sin checklist completo`),
            }));

            return { ok: false, message: "Checklist incompleto. El cierre queda bloqueado." };
          }
        }

        set((current) => ({
          ...(() => {
            const nextTasks = current.tasks.map((entry) =>
              entry.id === taskId
                ? {
                    ...entry,
                    columnId,
                    updatedAt: new Date().toISOString(),
                    blockedReason: columnId === "blocked" ? blockedReason ?? entry.blockedReason : undefined,
                    completedAt: columnId === "done" ? new Date().toISOString() : undefined,
                  }
                : entry,
            );
            const nextActivity = appendActivity(
              current.activity,
              actorId,
              columnId === "blocked" && (blockedReason ?? task.blockedReason)
                ? `Bloqueo "${task.title}" por: ${blockedReason ?? task.blockedReason}`
                : `Movio "${task.title}" a ${targetColumn.title}`,
            );

            return {
              tasks: nextTasks,
              activity: nextActivity,
              scoreSnapshots: refreshScoreSnapshots({
                users: current.users,
                tasks: nextTasks,
                checklists: current.checklists,
                activity: nextActivity,
                scoreSnapshots: current.scoreSnapshots,
              }),
            };
          })(),
        }));

        void get().pushRuntimeToServer();

        return { ok: true };
      },
      updateTask: (taskId, patch, actorId) => {
        const state = get();
        const task = state.tasks.find((entry) => entry.id === taskId);
        const actor = state.users.find((entry) => entry.id === actorId);
        if (!task || !actor) {
          return { ok: false, message: "No se encontro la tarea o el usuario que intenta editarla" };
        }
        if (!canEditTask(actor, task, state.users)) {
          return { ok: false, message: "Tu rol no puede editar prioridad o fecha de esta tarea" };
        }

        const editablePatch = {
          priority: patch.priority ?? task.priority,
          dueAt: patch.dueAt ?? task.dueAt,
        };
        const parsed = taskEditSchema.safeParse(editablePatch);
        if (!parsed.success) {
          return { ok: false, message: parsed.error.issues[0]?.message ?? "No se pudo validar la edicion de la tarea" };
        }

        set((current) => {
          const nextTasks = current.tasks.map((entry) =>
            entry.id === taskId
              ? {
                  ...entry,
                  priority: editablePatch.priority,
                  dueAt: editablePatch.dueAt,
                  updatedAt: new Date().toISOString(),
                }
              : entry,
          );
          const nextActivity = appendActivity(
            current.activity,
            actorId,
            `Edito "${task.title}" y actualizo prioridad a ${editablePatch.priority} con nueva fecha limite`,
          );

          return {
            tasks: nextTasks,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: current.users,
              tasks: nextTasks,
              checklists: current.checklists,
              activity: nextActivity,
              scoreSnapshots: current.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();

        return { ok: true };
      },
      toggleChecklistItem: (checklistId, itemId, actorId) => {
        const actor = get().users.find((entry) => entry.id === actorId);
        const currentChecklist = get().checklists.find((entry) => entry.id === checklistId);
        if (!actor || !currentChecklist) {
          return { ok: false, message: "No se encontro el checklist solicitado" };
        }
        if (!canToggleChecklist(actor, currentChecklist)) {
          return { ok: false, message: "Tu rol no puede editar este checklist" };
        }
        let title = "";
        const nextChecklists = get().checklists.map((checklist) => {
          if (checklist.id !== checklistId) return checklist;
          title = checklist.templateName;
          return recalculateChecklistStatus({
            ...checklist,
            items: checklist.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    done: !item.done,
                    completedAt: !item.done ? new Date().toISOString() : undefined,
                  }
                : item,
            ),
          });
        });

        set((state) => ({
          ...(() => {
            const nextActivity = appendActivity(state.activity, actorId, `Actualizo un item de ${title}`);
            return {
              checklists: nextChecklists,
              activity: nextActivity,
              scoreSnapshots: refreshScoreSnapshots({
                users: state.users,
                tasks: state.tasks,
                checklists: nextChecklists,
                activity: nextActivity,
                scoreSnapshots: state.scoreSnapshots,
              }),
            };
          })(),
        }));

        void get().pushRuntimeToServer();

        return { ok: true };
      },
      createProspect: (input, actorId) => {
        const state = get();
        const actor = state.users.find((user) => user.id === actorId);
        if (!actor) {
          return { ok: false, message: "No se encontro al usuario que intenta registrar el prospecto." };
        }
        const salesperson = state.users.find((user) => user.id === input.salespersonId);
        if (!salesperson) {
          return { ok: false, message: "El vendedor seleccionado no existe." };
        }
        if (!canManageCommercialEntityByScope(actor, salesperson, input.salespersonId)) {
          return { ok: false, message: "Tu perfil no puede registrar prospectos fuera de tu agencia o area." };
        }

        const createdAt = new Date().toISOString();
        const prospect: Prospect = {
          id: crypto.randomUUID(),
          groupId: salesperson.groupId,
          brandId: salesperson.brandId,
          siteId: salesperson.siteId,
          customerName: input.customerName,
          salespersonId: input.salespersonId,
          agency: input.agency,
          source: input.source,
          status: "new",
          createdAt,
          nextActionAt: input.nextActionAt,
          vehicleInterest: input.vehicleInterest,
          financingRequired: input.financingRequired,
          notes: input.notes,
        };

        set((current) => {
          const nextActivity = appendActivity(
            current.activity,
            actorId,
            `Registro el prospecto "${prospect.customerName}" para ${salesperson.name}`,
          );

          return {
            prospects: [prospect, ...current.prospects],
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: current.users,
              tasks: current.tasks,
              checklists: current.checklists,
              activity: nextActivity,
              scoreSnapshots: current.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
        return { ok: true };
      },
      advanceProspectStatus: (prospectId, status, actorId) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const target = state.prospects.find((prospect) => prospect.id === prospectId);
          if (!actor || !target || !canManageProspect(actor, target)) {
            return state;
          }
          const nextProspects = state.prospects.map((prospect) =>
            prospect.id === prospectId
              ? {
                  ...prospect,
                  status,
                  nextActionAt:
                    status === "closed_won" || status === "closed_lost" ? undefined : prospect.nextActionAt ?? new Date().toISOString(),
                }
              : prospect,
          );
          const updatedProspect = nextProspects.find((prospect) => prospect.id === prospectId);
          const nextOperations = updatedProspect ? syncOperationWithProspect(state.salesOperations, updatedProspect) : state.salesOperations;
          const nextActivity = updatedProspect
            ? appendActivity(state.activity, actorId, `Movio a "${updatedProspect.customerName}" a ${status}`)
            : state.activity;

          return {
            prospects: nextProspects,
            salesOperations: nextOperations,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
      },
      scheduleTestDrive: (prospectId, scheduledAt, actorId) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const prospect = state.prospects.find((entry) => entry.id === prospectId);
          if (!actor || !prospect || !canManageProspect(actor, prospect)) {
            return state;
          }

          const existing = state.testDrives.find((entry) => entry.prospectId === prospectId && entry.status === "scheduled");
          const nextTestDrives: TestDrive[] = existing
            ? state.testDrives.map((testDrive) =>
                testDrive.id === existing.id
                  ? {
                      ...testDrive,
                      scheduledAt,
                      vehicleModel: prospect.vehicleInterest,
                      agency: prospect.agency,
                      groupId: prospect.groupId,
                      brandId: prospect.brandId,
                      siteId: prospect.siteId,
                    }
                  : testDrive,
              )
            : [
                {
                  id: crypto.randomUUID(),
                  prospectId,
                  salespersonId: prospect.salespersonId,
                  agency: prospect.agency,
                  vehicleModel: prospect.vehicleInterest,
                  scheduledAt,
              status: "scheduled",
              groupId: prospect.groupId,
              brandId: prospect.brandId,
              siteId: prospect.siteId,
            },
            ...state.testDrives,
          ];
          const nextProspects: Prospect[] = state.prospects.map((entry) =>
            entry.id === prospectId ? { ...entry, status: "test_drive", nextActionAt: scheduledAt } : entry,
          );
          const nextOperations: SalesOperation[] = state.salesOperations.map((operation) =>
            operation.prospectId === prospectId && operation.stage === "prospecting"
              ? { ...operation, stage: "test_drive", updatedAt: new Date().toISOString() }
              : operation,
          );
          const nextActivity = appendActivity(state.activity, actorId, `Agendo prueba de manejo para "${prospect.customerName}"`);

          return {
            testDrives: nextTestDrives,
            prospects: nextProspects,
            salesOperations: nextOperations,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
      },
      updateTestDriveStatus: (testDriveId, status, actorId) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const updatedDrive = state.testDrives.find((entry) => entry.id === testDriveId);
          if (!actor || !updatedDrive || !canManageTestDrive(actor, updatedDrive)) {
            return state;
          }

          const nextTestDrives: TestDrive[] = state.testDrives.map((testDrive) =>
            testDrive.id === testDriveId
              ? {
                  ...testDrive,
                  status,
                  completedAt: status === "completed" ? new Date().toISOString() : undefined,
                }
              : testDrive,
          );
          const nextProspects: Prospect[] = state.prospects.map((prospect) =>
            prospect.id === updatedDrive.prospectId
              ? {
                  ...prospect,
                  status: status === "completed" ? "negotiation" : status === "no_show" ? "follow_up" : "test_drive",
                }
              : prospect,
          );
          const nextOperations: SalesOperation[] = state.salesOperations.map((operation) =>
            operation.prospectId === updatedDrive.prospectId
              ? {
                  ...operation,
                  stage: status === "completed" ? "negotiation" : status === "no_show" ? "prospecting" : "test_drive",
                  updatedAt: new Date().toISOString(),
                }
              : operation,
          );
          const nextActivity = appendActivity(state.activity, actorId, `Actualizo prueba de manejo a ${status}`);

          return {
            testDrives: nextTestDrives,
            prospects: nextProspects,
            salesOperations: nextOperations,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
      },
      createSalesOperationFromProspect: (prospectId, actorId) => {
        const state = get();
        const actor = state.users.find((user) => user.id === actorId);
        const prospect = state.prospects.find((entry) => entry.id === prospectId);
        if (!actor || !prospect) {
          return { ok: false, message: "No se encontro el prospecto." };
        }
        if (!canManageProspect(actor, prospect)) {
          return { ok: false, message: "Tu perfil no puede abrir operaciones para ese prospecto." };
        }
        if (state.salesOperations.some((operation) => operation.prospectId === prospectId)) {
          return { ok: false, message: "Ese prospecto ya tiene una operacion abierta." };
        }

        const createdAt = new Date().toISOString();
        const operation: SalesOperation = {
          id: crypto.randomUUID(),
          groupId: prospect.groupId,
          brandId: prospect.brandId,
          siteId: prospect.siteId,
          prospectId: prospect.id,
          customerName: prospect.customerName,
          agency: prospect.agency,
          salespersonId: prospect.salespersonId,
          vehicleModel: prospect.vehicleInterest,
          stage: prospectStatusToOperationStage(prospect.status),
          source: prospect.source,
          financingRequired: prospect.financingRequired,
          financier: prospect.financingRequired ? "VWFS" : "Contado",
          subsidyType: "none",
          subsidyAmount: 0,
          tradeInRequired: prospect.notes.toLowerCase().includes("usado"),
          closingProbability: prospect.status === "negotiation" ? 70 : prospect.status === "test_drive" ? 45 : 25,
          expectedCloseAt: prospect.nextActionAt ?? createdAt,
          nextStep: "Actualizar negociacion, validaciones y fecha estimada de cierre.",
          notes: prospect.notes,
          createdAt,
          updatedAt: createdAt,
        };

        set((current) => {
          const nextActivity = appendActivity(current.activity, actorId, `Abre operacion comercial para "${prospect.customerName}"`);

          return {
            salesOperations: [operation, ...current.salesOperations],
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: current.users,
              tasks: current.tasks,
              checklists: current.checklists,
              activity: nextActivity,
              scoreSnapshots: current.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
        return { ok: true };
      },
      updateSalesOperationStage: (operationId, stage, actorId) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const now = new Date().toISOString();
          const currentOperation = state.salesOperations.find((operation) => operation.id === operationId);
          if (!actor || !currentOperation || !canManageSalesOperation(actor, currentOperation)) {
            return state;
          }
          let updatedOperation: SalesOperation | undefined;
          const nextOperations: SalesOperation[] = state.salesOperations.map((operation) => {
            if (operation.id !== operationId) {
              return operation;
            }

            updatedOperation = {
              ...operation,
              stage,
              updatedAt: now,
              closedAt: stage === "closed_won" || stage === "closed_lost" ? now : operation.closedAt,
            };

            return updatedOperation;
          });

          if (!updatedOperation) {
            return state;
          }

          const operation = updatedOperation;
          const nextProspects: Prospect[] = syncProspectWithOperation(state.prospects, operation);
          let nextPostSale: PostSaleFollowUp[] = state.postSaleFollowUps;
          if (
            stage === "closed_won" &&
            !nextPostSale.some(
              (followUp) =>
                followUp.customerName === operation.customerName &&
                followUp.vehicleModel === operation.vehicleModel &&
                followUp.agency === operation.agency,
            )
          ) {
            nextPostSale = [buildPostSaleFollowUpFromOperation(operation), ...nextPostSale];
          }

          const nextCreditFiles: CreditFile[] = state.creditFiles.map((creditFile) =>
            creditFile.operationId === operationId && stage === "closed_won" && creditFile.status !== "cash_sale"
              ? { ...creditFile, status: "approved", decisionAt: now }
              : creditFile,
          );
          const nextActivity = appendActivity(
            state.activity,
            actorId,
            `Movio operacion de "${operation.customerName}" a ${stage}`,
          );

          return {
            salesOperations: nextOperations,
            prospects: nextProspects,
            creditFiles: nextCreditFiles,
            postSaleFollowUps: nextPostSale,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
      },
      updateSalesOperation: (operationId, patch, actorId) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const currentOperation = state.salesOperations.find((operation) => operation.id === operationId);
          if (!actor || !currentOperation || !canManageSalesOperation(actor, currentOperation)) {
            return state;
          }
          const nextOperations: SalesOperation[] = state.salesOperations.map((operation) =>
            operation.id === operationId
              ? {
                  ...operation,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                }
              : operation,
          );
          const operation = nextOperations.find((entry) => entry.id === operationId);
          const nextProspects: Prospect[] = operation ? syncProspectWithOperation(state.prospects, operation) : state.prospects;
          const nextActivity = operation
            ? appendActivity(state.activity, actorId, `Actualizo datos de operacion para "${operation.customerName}"`)
            : state.activity;

          return {
            salesOperations: nextOperations,
            prospects: nextProspects,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
      },
      createCreditFileForOperation: (operationId, actorId) => {
        const state = get();
        const actor = state.users.find((user) => user.id === actorId);
        const operation = state.salesOperations.find((entry) => entry.id === operationId);
        if (!actor || !operation) {
          return { ok: false, message: "No se encontro la operacion." };
        }
        if (!canManageSalesOperation(actor, operation)) {
          return { ok: false, message: "Tu perfil no puede abrir expediente para esta operacion." };
        }
        if (!operation.financingRequired) {
          return { ok: false, message: "La operacion es de contado; no requiere expediente." };
        }
        if (state.creditFiles.some((creditFile) => creditFile.operationId === operationId)) {
          return { ok: false, message: "La operacion ya tiene expediente." };
        }

        const requiredDocuments = creditRequiredDocuments();
        const creditFile: CreditFile = {
          id: crypto.randomUUID(),
          groupId: operation.groupId,
          brandId: operation.brandId,
          siteId: operation.siteId,
          operationId,
          customerName: operation.customerName,
          agency: operation.agency,
          salespersonId: operation.salespersonId,
          financier: operation.financier,
          status: "collecting",
          downPaymentReady: false,
          requiredDocuments,
          receivedDocuments: [],
          missingDocuments: requiredDocuments,
          notes: "Expediente abierto para completar documentacion y envio a financiera.",
        };

        set((current) => {
          const nextOperations: SalesOperation[] = current.salesOperations.map((entry) =>
            entry.id === operationId ? { ...entry, stage: "credit_review", updatedAt: new Date().toISOString() } : entry,
          );
          const nextActivity = appendActivity(current.activity, actorId, `Abre expediente de credito para "${operation.customerName}"`);

          return {
            creditFiles: [creditFile, ...current.creditFiles],
            salesOperations: nextOperations,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: current.users,
              tasks: current.tasks,
              checklists: current.checklists,
              activity: nextActivity,
              scoreSnapshots: current.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
        return { ok: true };
      },
      updateCreditFileStatus: (creditFileId, status, actorId) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const now = new Date().toISOString();
          const currentCreditFile = state.creditFiles.find((creditFile) => creditFile.id === creditFileId);
          if (!actor || !currentCreditFile || !canManageCreditFile(actor, currentCreditFile)) {
            return state;
          }
          const nextCreditFiles: CreditFile[] = state.creditFiles.map((creditFile) =>
            creditFile.id === creditFileId
              ? {
                  ...creditFile,
                  status,
                  submittedAt: status === "submitted" ? now : creditFile.submittedAt,
                  decisionAt: status === "approved" || status === "rejected" ? now : creditFile.decisionAt,
                }
              : creditFile,
          );
          const creditFile = nextCreditFiles.find((entry) => entry.id === creditFileId);
          const nextOperations: SalesOperation[] = creditFile
            ? state.salesOperations.map((operation) =>
                operation.id === creditFile.operationId
                  ? {
                      ...operation,
                      stage:
                        status === "approved"
                          ? "ready_to_close"
                          : status === "submitted" || status === "missing_documents"
                            ? "credit_review"
                            : operation.stage,
                      updatedAt: now,
                    }
                  : operation,
              )
            : state.salesOperations;
          const nextActivity = creditFile
            ? appendActivity(state.activity, actorId, `Actualizo expediente de "${creditFile.customerName}" a ${status}`)
            : state.activity;

          return {
            creditFiles: nextCreditFiles,
            salesOperations: nextOperations,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
      },
      toggleCreditDocument: (creditFileId, documentName, actorId) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const currentCreditFile = state.creditFiles.find((creditFile) => creditFile.id === creditFileId);
          if (!actor || !currentCreditFile || !canManageCreditFile(actor, currentCreditFile)) {
            return state;
          }
          const nextCreditFiles: CreditFile[] = state.creditFiles.map((creditFile) => {
            if (creditFile.id !== creditFileId) {
              return creditFile;
            }

            const hasDocument = creditFile.receivedDocuments.includes(documentName);
            const receivedDocuments = hasDocument
              ? creditFile.receivedDocuments.filter((document) => document !== documentName)
              : [...creditFile.receivedDocuments, documentName];
            const missingDocuments = creditFile.requiredDocuments.filter((document) => !receivedDocuments.includes(document));

            return {
              ...creditFile,
              receivedDocuments,
              missingDocuments,
              status:
                creditFile.status === "approved" || creditFile.status === "rejected" || creditFile.status === "cash_sale"
                  ? creditFile.status
                  : missingDocuments.length
                    ? "missing_documents"
                    : "collecting",
            };
          });
          const creditFile = nextCreditFiles.find((entry) => entry.id === creditFileId);
          const nextActivity = creditFile
            ? appendActivity(state.activity, actorId, `Actualizo documentos del expediente de "${creditFile.customerName}"`)
            : state.activity;

          return {
            creditFiles: nextCreditFiles,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });

        void get().pushRuntimeToServer();
      },
      updateBellIncident: (incidentId, status, actorId, resolutionNote) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const currentIncident = state.bellIncidents.find((incident) => incident.id === incidentId);
          if (!actor || !currentIncident || !canManageBellIncident(actor, currentIncident)) {
            return state;
          }
          const nextIncidents = state.bellIncidents.map((incident) =>
            incident.id === incidentId
              ? {
                  ...incident,
                  status,
                  updatedAt: new Date().toISOString(),
                  resolutionNote: resolutionNote ?? incident.resolutionNote,
                }
              : incident,
          );
          const incident = state.bellIncidents.find((entry) => entry.id === incidentId);
          const nextActivity = incident
            ? appendActivity(state.activity, actorId, `Actualizo incidente de campana "${incident.customerName}" a ${status}`)
            : state.activity;

          return {
            bellIncidents: nextIncidents,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });
        void get().pushRuntimeToServer();
      },
      updatePostSaleFollowUp: (followUpId, status, actorId) => {
        set((state) => {
          const actor = state.users.find((user) => user.id === actorId);
          const currentFollowUp = state.postSaleFollowUps.find((followUp) => followUp.id === followUpId);
          if (!actor || !currentFollowUp || !canManagePostSaleFollowUp(actor, currentFollowUp)) {
            return state;
          }
          const nextFollowUps = state.postSaleFollowUps.map((followUp) =>
            followUp.id === followUpId
              ? {
                  ...followUp,
                  status,
                  lastContactAt: status === "contacted" || status === "closed" ? new Date().toISOString() : followUp.lastContactAt,
                }
              : followUp,
          );
          const followUp = state.postSaleFollowUps.find((entry) => entry.id === followUpId);
          const nextActivity = followUp
            ? appendActivity(state.activity, actorId, `Actualizo seguimiento post-venta de "${followUp.customerName}" a ${status}`)
            : state.activity;

          return {
            postSaleFollowUps: nextFollowUps,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: state.users,
              tasks: state.tasks,
              checklists: state.checklists,
              activity: nextActivity,
              scoreSnapshots: state.scoreSnapshots,
            }),
          };
        });
        void get().pushRuntimeToServer();
      },
      updateScheduledBroadcast: async (broadcastId, patch, actorId) => {
        const state = get();
        const actor = state.users.find((user) => user.id === actorId);
        if (!actor || (actor.role !== "admin" && actor.role !== "owner")) {
          return { ok: false, message: "Tu perfil no puede editar broadcasts programados." };
        }

        const broadcast = state.scheduledBroadcasts.find((entry) => entry.id === broadcastId);
        if (!broadcast) {
          return { ok: false, message: "No se encontro el broadcast." };
        }

        set((current) => {
          const nextBroadcasts = current.scheduledBroadcasts.map((entry) =>
            entry.id === broadcastId ? { ...entry, ...patch } : entry,
          );
          const nextActivity = appendActivity(current.activity, actorId, `Actualizo broadcast programado "${broadcast.title}"`);

          return {
            scheduledBroadcasts: nextBroadcasts,
            activity: nextActivity,
            scoreSnapshots: refreshScoreSnapshots({
              users: current.users,
              tasks: current.tasks,
              checklists: current.checklists,
              activity: nextActivity,
              scoreSnapshots: current.scoreSnapshots,
            }),
          };
        });

        await get().pushRuntimeToServer();
        return { ok: true };
      },
      runScheduledBroadcastNow: async (broadcastId, actorId) => {
        const state = get();
        const actor = state.users.find((user) => user.id === actorId);
        if (!actor || (actor.role !== "admin" && actor.role !== "owner")) {
          return { ok: false, message: "Tu perfil no puede disparar broadcasts." };
        }

        const broadcast = state.scheduledBroadcasts.find((entry) => entry.id === broadcastId);
        if (!broadcast) {
          return { ok: false, message: "No se encontro el broadcast." };
        }

        await runBroadcastNowRequest(broadcastId);
        await get().syncRuntimeFromServer();
        return { ok: true, message: `Broadcast "${broadcast.title}" enviado.` };
      },
      markAlertRead: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map((alert) => (alert.id === alertId ? { ...alert, read: true } : alert)),
        }));
        void get().pushRuntimeToServer();
      },
      addColumn: (title, color) =>
        set((state) => ({
          columns: [...state.columns, { id: crypto.randomUUID(), title, color }],
        })),
    }),
    {
      name: "capataz-dashboard-store",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        state?.initialize();
      },
    },
  ),
);

export function useCurrentUser() {
  return useAppStore((state) => state.users.find((user) => user.id === state.sessionUserId) ?? null);
}
