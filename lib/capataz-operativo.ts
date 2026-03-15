import { z } from "zod";
import { generateGeminiJson, generateGeminiText, geminiEnabled } from "@/lib/ai/gemini";
import {
  canManageBellIncident,
  canManageCommercialEntity,
  canManageCreditFile,
  canManagePostSaleFollowUp,
  canManageProspect,
  canManageSalesOperation,
  canManageTestDrive,
  canMoveTask as canMoveTaskByScope,
  canViewBellIncident,
  canViewCommercialEntity,
  canViewCreditFile,
  canViewPostSaleFollowUp,
  canViewProspect,
  canViewSalesOperation,
  canViewTask,
  canViewTestDrive,
  canViewUserProfile,
  isSalesUser,
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
import { seedData } from "@/lib/seed-data";
import { loadRuntimeSnapshot, persistRuntimeSnapshot } from "@/lib/runtime-storage";
import type {
  ActivityEntry,
  Alert,
  ChecklistInstance,
  CreditFile,
  BroadcastAudience,
  Prospect,
  Priority,
  RuntimeSyncPayload,
  SalesOperation,
  ScheduledBroadcast,
  Task,
  TestDrive,
  User,
  BellIncident,
  PostSaleFollowUp,
} from "@/lib/types";

export type CapatazChannel = "mock_whatsapp" | "whatsapp_cloud";
export type ReportKind = "general" | "daily_closure" | "blockers" | "team_member";

export interface PublicCollaboratorContact {
  userId: string;
  name: string;
  role: User["role"];
  site: string;
  phone: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
}

export interface OperationalExtraction {
  intent: string;
  summary: string;
  detectedTasks: string[];
  blockers: string[];
  followUps: string[];
  requestedReport: ReportKind | null;
  targetUserName: string | null;
  note: string | null;
  suggestedTaskTitle: string | null;
  suggestedTaskDescription: string | null;
  suggestedAssigneeName: string | null;
  suggestedPriority: Priority | null;
  suggestedDueAt: string | null;
  suggestedLocation: string | null;
  wantsSuggestions: boolean;
}

export interface GeneratedReport {
  id: string;
  kind: ReportKind;
  title: string;
  body: string;
  generatedAt: string;
  targetUserId?: string;
}

export interface OperationalNote {
  id: string;
  createdAt: string;
  createdByUserId: string;
  source: "user_message" | "assistant_summary";
  title: string;
  body: string;
}

export interface OperationalSuggestion {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
}

interface ConversationThread {
  channel: CapatazChannel;
  phone: string;
  userId: string | null;
  messages: ConversationMessage[];
  latestAnalysis: OperationalExtraction | null;
  latestReport: GeneratedReport | null;
}

interface RuntimeState {
  users: User[];
  tasks: Task[];
  checklists: ChecklistInstance[];
  alerts: Alert[];
  activity: Array<{
    id: string;
    actorId: string;
    message: string;
    createdAt: string;
  }>;
  prospects: Prospect[];
  testDrives: TestDrive[];
  salesOperations: SalesOperation[];
  creditFiles: CreditFile[];
  bellIncidents: BellIncident[];
  postSaleFollowUps: PostSaleFollowUp[];
  scheduledBroadcasts: ScheduledBroadcast[];
  reports: GeneratedReport[];
  notes: OperationalNote[];
  suggestions: OperationalSuggestion[];
}

interface RuntimeEnvelope {
  state: RuntimeState;
  threads: Record<string, ConversationThread>;
}

interface ActionResult {
  intent: string;
  reply?: string;
  action?: string;
  report?: GeneratedReport | null;
  note?: OperationalNote | null;
  suggestions?: OperationalSuggestion[];
}

const extractionSchema = z.object({
  intent: z.string(),
  summary: z.string(),
  detectedTasks: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  followUps: z.array(z.string()).default([]),
  requestedReport: z.enum(["general", "daily_closure", "blockers", "team_member"]).nullable(),
  targetUserName: z.string().nullable(),
  note: z.string().nullable(),
  suggestedTaskTitle: z.string().nullable(),
  suggestedTaskDescription: z.string().nullable(),
  suggestedAssigneeName: z.string().nullable(),
  suggestedPriority: z.enum(["low", "medium", "high", "critical"]).nullable(),
  suggestedDueAt: z.string().nullable(),
  suggestedLocation: z.string().nullable(),
  wantsSuggestions: z.boolean().default(false),
});

let runtimeCache: RuntimeEnvelope | null = null;
let runtimeLoadPromise: Promise<RuntimeEnvelope> | null = null;

function nowIso() {
  return new Date().toISOString();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getDateParts(timezone: string, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dateKey: `${lookup.year}-${lookup.month}-${lookup.day}`,
    timeKey: `${lookup.hour}:${lookup.minute}`,
    weekday: lookup.weekday?.toLowerCase() ?? "mon",
  };
}

function audienceMatches(user: User, audience: BroadcastAudience) {
  if (audience === "all_staff") {
    return true;
  }
  if (audience === "sales_only") {
    return user.department === "sales" || user.department === "general_management";
  }
  return user.department === "service";
}

function shouldSendScheduledBroadcast(broadcast: ScheduledBroadcast, now = new Date()) {
  if (!broadcast.active) {
    return false;
  }

  const { dateKey, timeKey, weekday } = getDateParts(broadcast.timezone, now);
  if (broadcast.lastSentOn === dateKey) {
    return false;
  }
  if (broadcast.frequency === "weekdays" && (weekday === "sat" || weekday === "sun")) {
    return false;
  }

  return timeKey >= broadcast.timeOfDay;
}

function renderBroadcastMessage(broadcast: ScheduledBroadcast) {
  return [broadcast.title, broadcast.message, broadcast.audioLabel ? `Audio: ${broadcast.audioLabel}` : null]
    .filter(Boolean)
    .join("\n");
}

function cloneSeedState(): RuntimeState {
  return JSON.parse(
    JSON.stringify({
      users: seedData.users,
      tasks: seedData.tasks,
      checklists: seedData.checklists,
      alerts: seedData.alerts,
      activity: seedData.activity,
      prospects: seedData.prospects,
      testDrives: seedData.testDrives,
      salesOperations: seedData.salesOperations,
      creditFiles: seedData.creditFiles,
      bellIncidents: seedData.bellIncidents,
      postSaleFollowUps: seedData.postSaleFollowUps,
      scheduledBroadcasts: seedData.scheduledBroadcasts,
      reports: [],
      notes: [],
      suggestions: [],
    }),
  ) as RuntimeState;
}

function createSeedRuntime(): RuntimeEnvelope {
  return {
    state: cloneSeedState(),
    threads: {},
  };
}

function ensureSeedArtifact<T extends { id: string }>(collection: T[], artifact: T) {
  if (!collection.some((entry) => entry.id === artifact.id)) {
    collection.unshift(artifact);
  }
}

function seedDemoThread(
  runtime: RuntimeEnvelope,
  options: {
    phone: string;
    report?: GeneratedReport;
    analysis?: OperationalExtraction;
    messages: Array<Pick<ConversationMessage, "role" | "text">>;
    note?: OperationalNote;
    suggestion?: OperationalSuggestion;
  },
) {
  const thread = ensureThread(runtime, options.phone, "mock_whatsapp");

  if (thread.messages.length > 1) {
    return false;
  }

  const seededMessages = thread.messages.slice(0, 1);
  options.messages.forEach((message, index) => {
    seededMessages.push({
      id: crypto.randomUUID(),
      role: message.role,
      text: message.text,
      createdAt: new Date(Date.now() - (options.messages.length - index) * 60_000).toISOString(),
    });
  });

  thread.messages = seededMessages;
  thread.latestAnalysis = options.analysis ?? null;
  thread.latestReport = options.report ?? null;

  if (options.report) {
    ensureSeedArtifact(runtime.state.reports, options.report);
  }
  if (options.note) {
    ensureSeedArtifact(runtime.state.notes, options.note);
  }
  if (options.suggestion) {
    ensureSeedArtifact(runtime.state.suggestions, options.suggestion);
  }

  return true;
}

function findRuntimeUser(runtime: RuntimeEnvelope, identifiers: string[]) {
  const normalized = new Set(identifiers.map((value) => value.toLowerCase()));
  return (
    runtime.state.users.find((user) => normalized.has(user.id.toLowerCase()) || normalized.has(user.email.toLowerCase())) ?? null
  );
}

function ensureSeedThreads(runtime: RuntimeEnvelope) {
  const ricardo = findRuntimeUser(runtime, ["usr-admin", "ricardo@capataz.ai"]);
  const victor = findRuntimeUser(runtime, ["usr-victor-demo", "victor@capataz.ai"]);
  const ian = findRuntimeUser(runtime, ["usr-owner", "ian@capataz.ai"]);
  const laura = findRuntimeUser(runtime, ["usr-supervisor-1", "laura@capataz.ai"]);
  const jose = findRuntimeUser(runtime, ["usr-supervisor-2", "jose@capataz.ai"]);
  const diego = findRuntimeUser(runtime, ["usr-operator-1", "diego@capataz.ai"]);
  const fernanda = findRuntimeUser(runtime, ["usr-operator-2", "fernanda@capataz.ai"]);
  const ana = findRuntimeUser(runtime, ["usr-operator-3", "ana@capataz.ai"]);
  const carlos = findRuntimeUser(runtime, ["usr-operator-4", "carlos@capataz.ai"]);

  let changed = false;

  if (ricardo?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: ricardo.phone,
        analysis: {
          intent: "report_request",
          summary: "Ricardo pidió corte multisucursal y foco de bloqueo comercial.",
          detectedTasks: ["Consolidar corte comercial de agencias Puebla Centro y Angelopolis"],
          blockers: ["Expedientes faltantes", "Campanas abiertas en servicio"],
          followUps: ["Presionar cierre de operaciones listas"],
          requestedReport: "general",
          targetUserName: null,
          note: "Director de marca revisando cierre del mes.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: true,
        },
        report: {
          id: "seed-report-ricardo",
          kind: "general",
          title: "Corte multisucursal para Ricardo Perez",
          body: "Puebla Centro trae mejor avance en pruebas y cierres. Angelopolis necesita resolver campanas abiertas y expedientes con documentos faltantes para no enfriar el mes.",
          generatedAt: nowIso(),
          targetUserId: ricardo.id,
        },
        note: {
          id: "seed-note-ricardo",
          createdAt: nowIso(),
          createdByUserId: ricardo.id,
          source: "assistant_summary",
          title: "Lectura corporativa inicial",
          body: "El director prioriza comparativo de agencias, bloqueos de credito y retencion post-venta.",
        },
        suggestion: {
          id: "seed-suggestion-ricardo",
          createdAt: nowIso(),
          title: "Subir presion sobre cierres calientes",
          body: "Concentrar a gerencia comercial en operaciones ready_to_close y expedientes missing_documents para mover el cierre semanal.",
          severity: "warning",
        },
        messages: [
          { role: "user", text: "Capataz, dame corte general de las agencias y dime donde se nos esta atorando el cierre." },
          {
            role: "assistant",
            text: "Traes mejor ritmo en Puebla Centro. Angelopolis necesita destrabar expedientes y campanas abiertas; te dejo corte ejecutivo y foco inmediato en cierres calientes.",
          },
        ],
      }) || changed;
  }

  if (victor?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: victor.phone,
        analysis: {
          intent: "team_member",
          summary: "Victor pidió estatus de junta diaria y seguimiento de vendedores.",
          detectedTasks: ["Preparar junta diaria", "Revisar pruebas de manejo", "Empujar seguimiento post-venta"],
          blockers: ["Falta autorizacion de descuento", "Expediente incompleto para cierre"],
          followUps: ["Llamar a clientes entregados", "Confirmar pruebas del dia"],
          requestedReport: "team_member",
          targetUserName: "Diego",
          note: "Victor revisa junta diaria de su agencia.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: false,
        },
        report: {
          id: "seed-report-victor",
          kind: "team_member",
          title: "Corte de junta para Victor Ramirez",
          body: "Diego trae seguimiento pendiente en post-venta y una operación frenada por descuento. Fernanda viene mejor en pruebas de manejo y expediente más ordenado.",
          generatedAt: nowIso(),
          targetUserId: victor.id,
        },
        note: {
          id: "seed-note-victor",
          createdAt: nowIso(),
          createdByUserId: victor.id,
          source: "assistant_summary",
          title: "Agenda de junta diaria",
          body: "Abrir con pruebas de manejo del día, operaciones ready_to_close y clientes entregados sin seguimiento.",
        },
        suggestion: {
          id: "seed-suggestion-victor",
          createdAt: nowIso(),
          title: "Apretar seguimiento comercial",
          body: "Pedir a cada vendedor prospectos nuevos, pruebas completadas y clientes contactados antes de cerrar la junta.",
          severity: "info",
        },
        messages: [
          { role: "user", text: "Capataz, preparame la junta y dime como viene Diego contra el resto." },
          {
            role: "assistant",
            text: "Para la junta: Diego trae post-venta vencida y descuento atorado; Fernanda va mejor en pruebas y orden de expediente. Ya te dejé corte resumido.",
          },
        ],
      }) || changed;
  }

  if (ian?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: ian.phone,
        analysis: {
          intent: "business_summary",
          summary: "Ian pidio panorama ejecutivo de la agencia con foco en cierres y campanas.",
          detectedTasks: ["Revisar cierre de Jetta", "Atender campanas pendientes", "Presionar seguimiento post-venta"],
          blockers: ["Avaluo usado bloqueado", "Descuento pendiente de autorizacion"],
          followUps: ["Revisar conversion por vendedor", "Cerrar pendientes de junta"],
          requestedReport: "general",
          targetUserName: null,
          note: "Gerencia general revisando control diario.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: true,
        },
        messages: [
          { role: "user", text: "Capataz, dame el panorama de la agencia y donde traemos mas riesgo ahorita." },
          {
            role: "assistant",
            text: "Traes riesgo en el avaluo usado, una campana abierta y seguimiento post-venta vencido. El cierre mas caliente sigue siendo Jetta, pero depende de mantener limpio el expediente.",
          },
        ],
      }) || changed;
  }

  if (laura?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: laura.phone,
        analysis: {
          intent: "team_member",
          summary: "Laura trae la junta comercial y esta empujando a Diego y Fernanda.",
          detectedTasks: ["Preparar junta diaria de pendientes comerciales", "Revisar subvencion aplicada al enganche"],
          blockers: ["Descuento sin autorizacion", "Expediente incompleto para cierre"],
          followUps: ["Confirmar pruebas de manejo", "Aterrizar clientes entregados sin llamada"],
          requestedReport: "team_member",
          targetUserName: "Diego",
          note: "Gerencia comercial operando junta diaria.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: false,
        },
        messages: [
          { role: "user", text: "Capataz, ordename la junta y dime a quien traigo mas presionado hoy." },
          {
            role: "assistant",
            text: "Abre con pruebas del dia, cierres listos y expedientes trabados. Hoy trae mas presion Diego por post-venta vencida; Fernanda viene mas ordenada en pruebas y expediente.",
          },
        ],
      }) || changed;
  }

  if (jose?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: jose.phone,
        analysis: {
          intent: "blockers",
          summary: "Jose esta revisando bloqueos de servicio y toma de usado.",
          detectedTasks: ["Cerrar avaluo de usado para toma a cuenta"],
          blockers: ["Diagnostico mecanico pendiente", "Oferta final aun sin negociar"],
          followUps: ["Escalar taller", "Liberar precio final"],
          requestedReport: "blockers",
          targetUserName: null,
          note: "Gerencia de servicio con foco en destrabe.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: false,
        },
        messages: [
          { role: "user", text: "Capataz, ensename lo que tengo bloqueado en servicio y que me falta para liberarlo." },
          {
            role: "assistant",
            text: "El bloqueo fuerte sigue en el avaluo de usado: falta diagnostico mecanico y cerrar la oferta final con el cliente. Si eso sale hoy, destrabas una operacion relevante.",
          },
        ],
      }) || changed;
  }

  if (diego?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: diego.phone,
        analysis: {
          intent: "list_tasks",
          summary: "Diego consulta sus pendientes comerciales y post-venta.",
          detectedTasks: ["Seguimiento post-venta a entregas de la semana"],
          blockers: ["Descuento pendiente en una negociacion"],
          followUps: ["Llamar clientes entregados", "Actualizar CRM post-venta"],
          requestedReport: null,
          targetUserName: null,
          note: "Vendedor con foco en seguimiento.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: false,
        },
        messages: [
          { role: "user", text: "Capataz, cuales son mis pendientes de hoy?" },
          {
            role: "assistant",
            text: "Traes seguimiento post-venta de entregas recientes, una negociacion condicionada por descuento y una prueba de manejo que necesita confirmacion final.",
          },
        ],
      }) || changed;
  }

  if (fernanda?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: fernanda.phone,
        analysis: {
          intent: "list_prospects",
          summary: "Fernanda consulta prospectos, pruebas y expediente activo.",
          detectedTasks: ["Registrar guardia y clientes nuevos del piso", "Expediente de credito completo para Jetta Comfortline"],
          blockers: [],
          followUps: ["Confirmar visita de Karla", "Mantener orden del expediente"],
          requestedReport: null,
          targetUserName: null,
          note: "Vendedora con buen ritmo de pruebas.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: false,
        },
        messages: [
          { role: "user", text: "Capataz, dame mis prospectos y como va lo del Jetta." },
          {
            role: "assistant",
            text: "Karla sigue viva y bien perfilada para prueba y cierre. El expediente del Jetta quedo completo y listo para seguir avanzando con financiera.",
          },
        ],
      }) || changed;
  }

  if (ana?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: ana.phone,
        analysis: {
          intent: "list_post_sale",
          summary: "Ana revisa seguimientos y servicio recurrente.",
          detectedTasks: [],
          blockers: [],
          followUps: ["Mantener contacto con clientes de servicio", "Documentar experiencia post-servicio"],
          requestedReport: null,
          targetUserName: null,
          note: "Asesoria de servicio con disciplina operativa.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: false,
        },
        messages: [
          { role: "user", text: "Capataz, que seguimientos tengo que cuidar hoy en servicio?" },
          {
            role: "assistant",
            text: "Hoy el foco es mantener el seguimiento post-servicio al dia, capturar experiencia de clientes recientes y no dejar cabos sueltos de recompra.",
          },
        ],
      }) || changed;
  }

  if (carlos?.phone) {
    changed =
      seedDemoThread(runtime, {
        phone: carlos.phone,
        analysis: {
          intent: "list_incidents",
          summary: "Carlos esta atendiendo campanas y pendientes de refacciones.",
          detectedTasks: ["Levantar incidente de campana por cliente molesto"],
          blockers: ["Cliente molesto sin cierre documentado"],
          followUps: ["Registrar causa", "Acordar siguiente paso con cliente"],
          requestedReport: null,
          targetUserName: null,
          note: "Refacciones y campana bajo control operativo.",
          suggestedTaskTitle: null,
          suggestedTaskDescription: null,
          suggestedAssigneeName: null,
          suggestedPriority: null,
          suggestedDueAt: null,
          suggestedLocation: null,
          wantsSuggestions: false,
        },
        messages: [
          { role: "user", text: "Capataz, ensename la campana que traigo abierta y que falta cerrar." },
          {
            role: "assistant",
            text: "Traes una campana abierta por cliente molesto. Falta dejar causa clara, gerente que atendio y siguiente paso documentado para cerrarla bien.",
          },
        ],
      }) || changed;
  }

  return changed;
}

async function persistRuntime() {
  if (!runtimeCache) {
    return;
  }

  await persistRuntimeSnapshot(runtimeCache);
}

async function loadRuntimeFromDisk() {
  try {
    const parsed = await loadRuntimeSnapshot<RuntimeEnvelope>();
    if (!parsed) {
      const seedRuntime = createSeedRuntime();
      ensureSeedThreads(seedRuntime);
      await persistRuntimeSnapshot(seedRuntime);
      return seedRuntime;
    }
    const legacyTaskTitle = parsed.state?.tasks?.[0]?.title ?? "";
    if (legacyTaskTitle.includes("Inspeccion de tablero electrico") || legacyTaskTitle.includes("Entrega de material a cuadrilla")) {
      return createSeedRuntime();
    }
    parsed.state.users = hydrateUsers(parsed.state.users ?? seedData.users);
    parsed.state.prospects = hydrateProspects(parsed.state.prospects ?? seedData.prospects);
    parsed.state.testDrives = hydrateTestDrives(parsed.state.testDrives ?? seedData.testDrives);
    parsed.state.salesOperations = hydrateSalesOperations(parsed.state.salesOperations ?? seedData.salesOperations);
    parsed.state.creditFiles = hydrateCreditFiles(parsed.state.creditFiles ?? seedData.creditFiles);
    parsed.state.bellIncidents = hydrateBellIncidents(parsed.state.bellIncidents ?? seedData.bellIncidents);
    parsed.state.postSaleFollowUps = hydratePostSaleFollowUps(parsed.state.postSaleFollowUps ?? seedData.postSaleFollowUps);
    parsed.state.scheduledBroadcasts = hydrateScheduledBroadcasts(parsed.state.scheduledBroadcasts ?? seedData.scheduledBroadcasts);
    parsed.state.reports ??= [];
    parsed.state.notes ??= [];
    parsed.state.suggestions ??= [];
    parsed.threads ??= {};
    if (ensureSeedThreads(parsed)) {
      await persistRuntimeSnapshot(parsed);
    }
    return parsed;
  } catch {
    const seedRuntime = createSeedRuntime();
    ensureSeedThreads(seedRuntime);
    await persistRuntimeSnapshot(seedRuntime);
    return seedRuntime;
  }
}

function runScheduledBroadcast(runtime: RuntimeEnvelope, broadcast: ScheduledBroadcast, now = new Date()) {
  const recipients = runtime.state.users.filter((user) => Boolean(user.phone) && audienceMatches(user, broadcast.audience));

  recipients.forEach((user) => {
    const thread = ensureThread(runtime, user.phone as string, "mock_whatsapp");
    appendMessage(thread, "assistant", renderBroadcastMessage(broadcast));
  });

  const { dateKey } = getDateParts(broadcast.timezone, now);
  runtime.state.scheduledBroadcasts = runtime.state.scheduledBroadcasts.map((entry) =>
    entry.id === broadcast.id ? { ...entry, lastSentOn: dateKey } : entry,
  );
  appendActivity(runtime, "usr-admin", `Broadcast programado enviado: ${broadcast.title}`);

  return recipients.length;
}

function applyScheduledBroadcasts(runtime: RuntimeEnvelope, now = new Date()) {
  let changed = false;

  runtime.state.scheduledBroadcasts.forEach((broadcast) => {
    if (!shouldSendScheduledBroadcast(broadcast, now)) {
      return;
    }
    runScheduledBroadcast(runtime, broadcast, now);
    changed = true;
  });

  return changed;
}

async function ensureRuntime() {
  if (runtimeCache) {
    return runtimeCache;
  }

  if (!runtimeLoadPromise) {
    runtimeLoadPromise = loadRuntimeFromDisk().then((runtime) => {
      runtimeCache = runtime;
      return runtime;
    });
  }

  return runtimeLoadPromise;
}

async function refreshRuntime() {
  const runtime = await ensureRuntime();
  if (applyScheduledBroadcasts(runtime)) {
    await persistRuntime();
  }
  return runtime;
}

function getThreadKey(phone: string, channel: CapatazChannel) {
  return `${channel}:${normalizePhone(phone)}`;
}

function getUserByPhone(runtime: RuntimeEnvelope, phone: string) {
  const normalized = normalizePhone(phone);
  return runtime.state.users.find((user) => normalizePhone(user.phone ?? "") === normalized) ?? null;
}

function getVisibleTasks(runtime: RuntimeEnvelope, user: User) {
  return runtime.state.tasks.filter((task) => canViewTask(user, task, runtime.state.users));
}

function getChecklistByTask(runtime: RuntimeEnvelope, taskId: string) {
  return runtime.state.checklists.find((checklist) => checklist.taskId === taskId) ?? null;
}

function getVisibleProspects(runtime: RuntimeEnvelope, user: User) {
  return runtime.state.prospects.filter((prospect) => canViewProspect(user, prospect));
}

function getVisibleTestDrives(runtime: RuntimeEnvelope, user: User) {
  return runtime.state.testDrives.filter((testDrive) => canViewTestDrive(user, testDrive));
}

function getVisibleSalesOperations(runtime: RuntimeEnvelope, user: User) {
  return runtime.state.salesOperations.filter((operation) => canViewSalesOperation(user, operation));
}

function getVisibleCreditFiles(runtime: RuntimeEnvelope, user: User) {
  return runtime.state.creditFiles.filter((creditFile) => canViewCreditFile(user, creditFile));
}

function getVisibleBellIncidents(runtime: RuntimeEnvelope, user: User) {
  return runtime.state.bellIncidents.filter((incident) => canViewBellIncident(user, incident));
}

function getVisiblePostSaleFollowUps(runtime: RuntimeEnvelope, user: User) {
  return runtime.state.postSaleFollowUps.filter((followUp) => canViewPostSaleFollowUp(user, followUp));
}

function findTaskByReference(runtime: RuntimeEnvelope, user: User, reference: string) {
  const normalizedReference = normalizeText(reference);
  const visibleTasks = getVisibleTasks(runtime, user);

  if (!normalizedReference) {
    return null;
  }

  const exactId = visibleTasks.find((task) => normalizeText(task.id) === normalizedReference);
  if (exactId) {
    return exactId;
  }

  return (
    visibleTasks.find((task) => normalizeText(`${task.title} ${task.location} ${task.id}`).includes(normalizedReference)) ?? null
  );
}

function findUserByName(runtime: RuntimeEnvelope, reference: string | null) {
  if (!reference) {
    return null;
  }

  const normalizedReference = normalizeText(reference);
  return (
    runtime.state.users.find((candidate) => normalizeText(`${candidate.name} ${candidate.email} ${candidate.role}`).includes(normalizedReference)) ??
    null
  );
}

function findVisibleUserByName(runtime: RuntimeEnvelope, user: User, reference: string | null) {
  if (!reference) {
    return null;
  }

  const normalizedReference = normalizeText(reference);
  return (
    runtime.state.users.find(
      (candidate) =>
        canViewUserProfile(user, candidate) &&
        normalizeText(`${candidate.name} ${candidate.email} ${candidate.role}`).includes(normalizedReference),
    ) ?? null
  );
}

function findProspectByReference(runtime: RuntimeEnvelope, user: User, reference: string) {
  const normalizedReference = normalizeText(reference);
  const visibleProspects = getVisibleProspects(runtime, user);
  if (!normalizedReference) {
    return null;
  }
  return (
    visibleProspects.find((prospect) =>
      normalizeText(`${prospect.id} ${prospect.customerName} ${prospect.vehicleInterest} ${prospect.source}`).includes(normalizedReference),
    ) ?? null
  );
}

function findTestDriveByReference(runtime: RuntimeEnvelope, user: User, reference: string) {
  const normalizedReference = normalizeText(reference);
  const visibleTestDrives = getVisibleTestDrives(runtime, user);
  if (!normalizedReference) {
    return null;
  }
  return (
    visibleTestDrives.find((testDrive) =>
      normalizeText(`${testDrive.id} ${testDrive.vehicleModel} ${testDrive.prospectId}`).includes(normalizedReference),
    ) ?? null
  );
}

function findSalesOperationByReference(runtime: RuntimeEnvelope, user: User, reference: string) {
  const normalizedReference = normalizeText(reference);
  const visibleOperations = getVisibleSalesOperations(runtime, user);
  if (!normalizedReference) {
    return null;
  }
  return (
    visibleOperations.find((operation) =>
      normalizeText(`${operation.id} ${operation.customerName} ${operation.vehicleModel} ${operation.prospectId}`).includes(
        normalizedReference,
      ),
    ) ?? null
  );
}

function findCreditFileByReference(runtime: RuntimeEnvelope, user: User, reference: string) {
  const normalizedReference = normalizeText(reference);
  const visibleCreditFiles = getVisibleCreditFiles(runtime, user);
  if (!normalizedReference) {
    return null;
  }
  return (
    visibleCreditFiles.find((creditFile) =>
      normalizeText(`${creditFile.id} ${creditFile.customerName} ${creditFile.operationId} ${creditFile.financier}`).includes(
        normalizedReference,
      ),
    ) ?? null
  );
}

function findBellIncidentByReference(runtime: RuntimeEnvelope, user: User, reference: string) {
  const normalizedReference = normalizeText(reference);
  const visibleIncidents = getVisibleBellIncidents(runtime, user);
  if (!normalizedReference) {
    return null;
  }
  return (
    visibleIncidents.find((incident) =>
      normalizeText(`${incident.id} ${incident.customerName} ${incident.area} ${incident.summary}`).includes(normalizedReference),
    ) ?? null
  );
}

function findPostSaleFollowUpByReference(runtime: RuntimeEnvelope, user: User, reference: string) {
  const normalizedReference = normalizeText(reference);
  const visibleFollowUps = getVisiblePostSaleFollowUps(runtime, user);
  if (!normalizedReference) {
    return null;
  }
  return (
    visibleFollowUps.find((followUp) =>
      normalizeText(`${followUp.id} ${followUp.customerName} ${followUp.vehicleModel} ${followUp.nextStep}`).includes(normalizedReference),
    ) ?? null
  );
}

function formatTaskLine(task: Task) {
  return `- ${task.id}: ${task.title} | estado=${task.columnId} | vence=${task.dueAt.slice(0, 16).replace("T", " ")}`;
}

function appendActivity(runtime: RuntimeEnvelope, actorId: string, message: string) {
  runtime.state.activity.unshift({
    id: crypto.randomUUID(),
    actorId,
    message,
    createdAt: nowIso(),
  });
}

function appendAlert(runtime: RuntimeEnvelope, title: string, body: string, relatedTaskId?: string) {
  runtime.state.alerts.unshift({
    id: crypto.randomUUID(),
    title,
    body,
    severity: "warning",
    read: false,
    createdAt: nowIso(),
    relatedTaskId,
  });
}

function appendNote(runtime: RuntimeEnvelope, note: Omit<OperationalNote, "id" | "createdAt">) {
  const createdNote: OperationalNote = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    ...note,
  };
  runtime.state.notes.unshift(createdNote);
  runtime.state.notes = runtime.state.notes.slice(0, 50);
  return createdNote;
}

function appendSuggestions(runtime: RuntimeEnvelope, suggestions: Omit<OperationalSuggestion, "id" | "createdAt">[]) {
  const created = suggestions.map((suggestion) => ({
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    ...suggestion,
  }));

  runtime.state.suggestions = [...created, ...runtime.state.suggestions].slice(0, 20);
  return created;
}

function saveReport(runtime: RuntimeEnvelope, report: GeneratedReport) {
  runtime.state.reports.unshift(report);
  runtime.state.reports = runtime.state.reports.slice(0, 30);
  return report;
}

function collectMetrics(runtime: RuntimeEnvelope, viewer?: User | null) {
  const visibleTasks = viewer ? getVisibleTasks(runtime, viewer) : runtime.state.tasks;
  const visibleProspects = viewer ? getVisibleProspects(runtime, viewer) : runtime.state.prospects;
  const visibleTestDrives = viewer ? getVisibleTestDrives(runtime, viewer) : runtime.state.testDrives;
  const visibleOperations = viewer ? getVisibleSalesOperations(runtime, viewer) : runtime.state.salesOperations;
  const visibleCreditFiles = viewer ? getVisibleCreditFiles(runtime, viewer) : runtime.state.creditFiles;
  const visibleIncidents = viewer ? getVisibleBellIncidents(runtime, viewer) : runtime.state.bellIncidents;
  const visiblePostSale = viewer ? getVisiblePostSaleFollowUps(runtime, viewer) : runtime.state.postSaleFollowUps;
  const openTasks = visibleTasks.filter((task) => task.columnId !== "done");
  const blockedTasks = openTasks.filter((task) => task.columnId === "blocked");
  const overdueTasks = openTasks.filter((task) => new Date(task.dueAt).getTime() < Date.now());
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));
  const unreadAlerts = runtime.state.alerts.filter((alert) => !alert.read && (!viewer || !alert.relatedTaskId || visibleTaskIds.has(alert.relatedTaskId)));
  const activeProspects = visibleProspects.filter(
    (prospect) => prospect.status !== "closed_won" && prospect.status !== "closed_lost",
  );
  const scheduledTestDrives = visibleTestDrives.filter((testDrive) => testDrive.status === "scheduled");
  const activeOperations = visibleOperations.filter(
    (operation) => operation.stage !== "closed_won" && operation.stage !== "closed_lost",
  );
  const readyToCloseOperations = visibleOperations.filter((operation) => operation.stage === "ready_to_close");
  const wonOperations = visibleOperations.filter((operation) => operation.stage === "closed_won");
  const creditFilesMissing = visibleCreditFiles.filter((file) => file.status === "missing_documents");
  const openIncidents = visibleIncidents.filter((incident) => incident.status !== "resolved");
  const atRiskPostSale = visiblePostSale.filter((followUp) => followUp.status === "at_risk");

  return {
    openTasks,
    blockedTasks,
    overdueTasks,
    unreadAlerts,
    activeProspects,
    scheduledTestDrives,
    activeOperations,
    readyToCloseOperations,
    wonOperations,
    creditFilesMissing,
    openIncidents,
    atRiskPostSale,
  };
}

function summarizeBusiness(runtime: RuntimeEnvelope, viewer?: User | null) {
  const metrics = collectMetrics(runtime, viewer);
  return [
    "Resumen operativo actual:",
    `- abiertas: ${metrics.openTasks.length}`,
    `- bloqueadas: ${metrics.blockedTasks.length}`,
    `- vencidas: ${metrics.overdueTasks.length}`,
    `- alertas sin leer: ${metrics.unreadAlerts.length}`,
    `- prospectos vivos: ${metrics.activeProspects.length}`,
    `- pruebas agendadas: ${metrics.scheduledTestDrives.length}`,
    `- operaciones vivas: ${metrics.activeOperations.length}`,
    `- listas para cierre: ${metrics.readyToCloseOperations.length}`,
    `- expedientes incompletos: ${metrics.creditFilesMissing.length}`,
    `- campanas abiertas: ${metrics.openIncidents.length}`,
    `- post-venta en riesgo: ${metrics.atRiskPostSale.length}`,
  ].join("\n");
}

function helpMessage(user: User) {
  const base = [
    `Hola ${user.name.split(" ")[0]}.`,
    "Puedo ayudarte con tareas, memoria y reportes:",
    "- mis tareas",
    "- crea tarea programar prueba de manejo para jetta con diego manana",
    "- nota cliente molesto por entrega tardia de unidad",
    "- bloquear tsk-1 falta autorizacion de descuento",
    "- checklist tsk-1",
    "- check tsk-1 2",
    "- completar tsk-1",
    "- reporte general",
    "- reporte bloqueos",
    "- reporte cierre",
    "- sugerencias",
  ];

  if (isSalesUser(user)) {
    base.push("- mis prospectos");
    base.push("- crear prospecto mario cazares | taos highline");
    base.push("- agendar prueba prs-1");
    base.push("- completar prueba td-1");
    base.push("- abrir operacion prs-1");
    base.push("- operaciones");
    base.push("- expediente op-1");
    base.push("- expedientes");
    base.push("- enviar expediente cf-1");
    base.push("- aprobar expediente cf-1");
    base.push("- mis seguimientos");
    base.push("- contactar seguimiento psf-1");
    base.push("- cerrar seguimiento psf-1");
  }

  base.push("- levantar campana Juan Perez | servicio | cliente molesto por entrega");
  base.push("- tomar campana inc-1");
  base.push("- resolver campana inc-1 | se atendio y se ofrecio solucion");

  if (user.role !== "operator") {
    base.push("- reporte diego");
  }

  return base.join("\n");
}

function summarizeTasksForUser(runtime: RuntimeEnvelope, user: User) {
  const tasks = getVisibleTasks(runtime, user).filter((task) => task.columnId !== "done");
  if (!tasks.length) {
    return "No tienes tareas abiertas ahorita.";
  }

  return [`Tienes ${tasks.length} tarea(s) abiertas:`, ...tasks.slice(0, 6).map(formatTaskLine)].join("\n");
}

function summarizeProspectsForUser(runtime: RuntimeEnvelope, user: User) {
  const prospects = getVisibleProspects(runtime, user).filter(
    (prospect) => prospect.status !== "closed_won" && prospect.status !== "closed_lost",
  );
  if (!prospects.length) {
    return "No tienes prospectos visibles ahorita.";
  }

  return [
    `Tienes ${prospects.length} prospecto(s) vivos:`,
    ...prospects
      .slice(0, 6)
      .map(
        (prospect) =>
          `- ${prospect.id}: ${prospect.customerName} | ${prospect.vehicleInterest} | estado=${prospect.status} | agencia=${prospect.agency}`,
      ),
  ].join("\n");
}

function summarizeOperationsForUser(runtime: RuntimeEnvelope, user: User) {
  const operations = getVisibleSalesOperations(runtime, user).filter(
    (operation) => operation.stage !== "closed_won" && operation.stage !== "closed_lost",
  );
  if (!operations.length) {
    return "No tienes operaciones visibles ahorita.";
  }

  return [
    `Tienes ${operations.length} operacion(es) vivas:`,
    ...operations
      .slice(0, 6)
      .map(
        (operation) =>
          `- ${operation.id}: ${operation.customerName} | etapa=${operation.stage} | prob=${operation.closingProbability}% | agencia=${operation.agency}`,
      ),
  ].join("\n");
}

function summarizeCreditFilesForUser(runtime: RuntimeEnvelope, user: User) {
  const creditFiles = getVisibleCreditFiles(runtime, user);
  if (!creditFiles.length) {
    return "No tienes expedientes visibles ahorita.";
  }

  return [
    `Tienes ${creditFiles.length} expediente(s):`,
    ...creditFiles
      .slice(0, 6)
      .map(
        (creditFile) =>
          `- ${creditFile.id}: ${creditFile.customerName} | estado=${creditFile.status} | faltan=${creditFile.missingDocuments.length}`,
      ),
  ].join("\n");
}

function summarizeIncidentsForUser(runtime: RuntimeEnvelope, user: User) {
  const incidents = getVisibleBellIncidents(runtime, user).filter((incident) => incident.status !== "resolved");
  if (!incidents.length) {
    return "No tienes incidentes de campana visibles ahorita.";
  }

  return [
    `Tienes ${incidents.length} incidente(s) visibles:`,
    ...incidents
      .slice(0, 5)
      .map((incident) => `- ${incident.id}: ${incident.customerName} | area=${incident.area} | estado=${incident.status}`),
  ].join("\n");
}

function summarizePostSaleForUser(runtime: RuntimeEnvelope, user: User) {
  const followUps = getVisiblePostSaleFollowUps(runtime, user).filter((followUp) => followUp.status !== "closed");
  if (!followUps.length) {
    return "No tienes seguimientos post-venta visibles ahorita.";
  }

  return [
    `Tienes ${followUps.length} seguimiento(s) post-venta:`,
    ...followUps
      .slice(0, 6)
      .map(
        (followUp) =>
          `- ${followUp.id}: ${followUp.customerName} | ${followUp.vehicleModel} | estado=${followUp.status} | vence=${followUp.dueAt.slice(0, 10)}`,
      ),
  ].join("\n");
}

function defaultSalesDueAt() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(17, 0, 0, 0);
  return next.toISOString();
}

function generateGeneralReport(runtime: RuntimeEnvelope, viewer?: User | null) {
  const metrics = collectMetrics(runtime, viewer);
  const topBlocked = metrics.blockedTasks.slice(0, 3).map((task) => `${task.id} (${task.blockedReason ?? "sin motivo"})`);
  const overdue = metrics.overdueTasks.slice(0, 3).map((task) => `${task.id} vence ${task.dueAt.slice(0, 16).replace("T", " ")}`);
  const readyToClose = metrics.readyToCloseOperations
    .slice(0, 3)
    .map((operation) => `${operation.customerName} | ${operation.vehicleModel} | prob=${operation.closingProbability}%`);
  const missingCredit = metrics.creditFilesMissing
    .slice(0, 3)
    .map((file) => `${file.customerName} | faltan ${file.missingDocuments.join(", ")}`);

  return saveReport(runtime, {
    id: crypto.randomUUID(),
    kind: "general",
    title: "Reporte general operativo",
    generatedAt: nowIso(),
    body: [
      summarizeBusiness(runtime, viewer),
      topBlocked.length ? `Bloqueos clave:\n- ${topBlocked.join("\n- ")}` : "Bloqueos clave:\n- sin bloqueos criticos",
      overdue.length ? `Vencidas o por vencer:\n- ${overdue.join("\n- ")}` : "Vencidas o por vencer:\n- sin vencimientos criticos",
      readyToClose.length ? `Cierres probables:\n- ${readyToClose.join("\n- ")}` : "Cierres probables:\n- sin cierres calientes",
      missingCredit.length
        ? `Expedientes frenando cierre:\n- ${missingCredit.join("\n- ")}`
        : "Expedientes frenando cierre:\n- sin faltantes criticos",
    ].join("\n\n"),
  });
}

function generateBlockersReport(runtime: RuntimeEnvelope, viewer?: User | null) {
  const metrics = collectMetrics(runtime, viewer);
  const lines = metrics.blockedTasks.length
    ? metrics.blockedTasks.map((task) => `- ${task.id}: ${task.title} | motivo=${task.blockedReason ?? "sin motivo"}`)
    : ["- No hay tareas bloqueadas."];

  return saveReport(runtime, {
    id: crypto.randomUUID(),
    kind: "blockers",
    title: "Reporte de bloqueos",
    generatedAt: nowIso(),
    body: ["Bloqueos activos:", ...lines].join("\n"),
  });
}

function generateDailyClosureReport(runtime: RuntimeEnvelope, viewer?: User | null) {
  const today = nowIso().slice(0, 10);
  const visibleTasks = viewer ? getVisibleTasks(runtime, viewer) : runtime.state.tasks;
  const completedToday = visibleTasks.filter((task) => task.completedAt?.slice(0, 10) === today);
  const pending = visibleTasks.filter((task) => task.columnId !== "done").slice(0, 5);

  return saveReport(runtime, {
    id: crypto.randomUUID(),
    kind: "daily_closure",
    title: "Cierre del dia",
    generatedAt: nowIso(),
    body: [
      `Completadas hoy: ${completedToday.length}`,
      completedToday.length ? completedToday.map((task) => `- ${task.id}: ${task.title}`).join("\n") : "- Sin cierres hoy.",
      "",
      "Pendientes para seguimiento:",
      pending.length ? pending.map((task) => `- ${task.id}: ${task.title} | estado=${task.columnId}`).join("\n") : "- Sin pendientes.",
    ].join("\n"),
  });
}

function generateUserReport(runtime: RuntimeEnvelope, targetUser: User) {
  const tasks = runtime.state.tasks.filter((task) => task.assigneeId === targetUser.id);
  const open = tasks.filter((task) => task.columnId !== "done");
  const done = tasks.filter((task) => task.columnId === "done");
  const blocked = tasks.filter((task) => task.columnId === "blocked");
  const prospects = runtime.state.prospects.filter((prospect) => prospect.salespersonId === targetUser.id);
  const operations = runtime.state.salesOperations.filter((operation) => operation.salespersonId === targetUser.id);
  const won = operations.filter((operation) => operation.stage === "closed_won");
  const ready = operations.filter((operation) => operation.stage === "ready_to_close");
  const testDrives = runtime.state.testDrives.filter((testDrive) => testDrive.salespersonId === targetUser.id);
  const activity = runtime.state.activity.filter((entry) => entry.actorId === targetUser.id).slice(0, 4);

  return saveReport(runtime, {
    id: crypto.randomUUID(),
    kind: "team_member",
    title: `Reporte de ${targetUser.name}`,
    generatedAt: nowIso(),
    targetUserId: targetUser.id,
    body: [
      `${targetUser.name} | rol=${targetUser.role} | sede=${targetUser.site}`,
      `- abiertas: ${open.length}`,
      `- completadas: ${done.length}`,
      `- bloqueadas: ${blocked.length}`,
      `- prospectos vivos: ${prospects.filter((prospect) => prospect.status !== "closed_won" && prospect.status !== "closed_lost").length}`,
      `- pruebas de manejo: ${testDrives.length}`,
      `- operaciones listas para cierre: ${ready.length}`,
      `- cierres ganados: ${won.length}`,
      "",
      "Actividad reciente:",
      activity.length ? activity.map((entry) => `- ${entry.message}`).join("\n") : "- Sin actividad registrada reciente.",
    ].join("\n"),
  });
}

function generateSuggestions(runtime: RuntimeEnvelope, viewer?: User | null) {
  const metrics = collectMetrics(runtime, viewer);
  const next: Omit<OperationalSuggestion, "id" | "createdAt">[] = [];

  if (metrics.blockedTasks.length) {
    next.push({
      title: "Atacar bloqueos primero",
      body: `Hay ${metrics.blockedTasks.length} tarea(s) bloqueadas. Conviene liberar materiales o validaciones antes de abrir mas trabajo.`,
      severity: "critical",
    });
  }

  if (metrics.overdueTasks.length) {
    next.push({
      title: "Reducir vencidas",
      body: `Hay ${metrics.overdueTasks.length} tarea(s) vencidas o tarde. Reasigna responsables o ajusta fechas hoy mismo.`,
      severity: "warning",
    });
  }

  if (metrics.creditFilesMissing.length) {
    next.push({
      title: "Cerrar expedientes de credito",
      body: `Hay ${metrics.creditFilesMissing.length} expediente(s) con documentos faltantes. Sin eso se cae el cierre aun con cliente caliente.`,
      severity: "critical",
    });
  }

  if (!metrics.scheduledTestDrives.length && metrics.activeProspects.length) {
    next.push({
      title: "Faltan pruebas de manejo",
      body: "Hay prospectos vivos sin pruebas de manejo activas. El gerente deberia empujar agenda comercial hoy mismo.",
      severity: "warning",
    });
  }

  if (metrics.atRiskPostSale.length) {
    next.push({
      title: "Post-venta en riesgo",
      body: `Hay ${metrics.atRiskPostSale.length} cliente(s) vendidos con riesgo de fuga a otra agencia. No lo dejes para fin de mes.`,
      severity: "warning",
    });
  }

  if (!next.length) {
    next.push({
      title: "Operacion estable",
      body: "No se detectan focos rojos inmediatos. Conviene cerrar pendientes medianos y documentar evidencia.",
      severity: "info",
    });
  }

  return appendSuggestions(runtime, next);
}

function inferDueAt(rawDueAt: string | null) {
  if (rawDueAt && !Number.isNaN(Date.parse(rawDueAt))) {
    return new Date(rawDueAt).toISOString();
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  return tomorrow.toISOString();
}

function buildChecklistForTask(task: Task): ChecklistInstance {
  return {
    id: crypto.randomUUID(),
    taskId: task.id,
    templateName: task.priority === "critical" || task.priority === "high" ? "Checklist de ejecucion critica" : "Checklist operativo",
    assigneeId: task.assigneeId,
    status: "pending",
    items: [
      { id: crypto.randomUUID(), label: `Confirmar arranque en ${task.location}`, done: false, required: true },
      { id: crypto.randomUUID(), label: "Subir evidencia del trabajo", done: false, required: true },
      { id: crypto.randomUUID(), label: "Validar cierre operativo", done: false, required: true },
    ],
  };
}

function createTaskFromPlan(
  runtime: RuntimeEnvelope,
  user: User,
  plan: Pick<
    OperationalExtraction,
    "suggestedTaskTitle" | "suggestedTaskDescription" | "suggestedAssigneeName" | "suggestedPriority" | "suggestedDueAt" | "suggestedLocation"
  >,
) {
  if (!plan.suggestedTaskTitle) {
    return null;
  }

  const assignee =
    findVisibleUserByName(runtime, user, plan.suggestedAssigneeName) ??
    runtime.state.users.find((entry) => entry.role === "operator") ??
    runtime.state.users[0];
  const priority = plan.suggestedPriority ?? "medium";

  const task: Task = {
    id: crypto.randomUUID(),
    title: plan.suggestedTaskTitle,
    description: plan.suggestedTaskDescription ?? `Tarea generada por Capataz a partir de un mensaje operativo de ${user.name}.`,
    priority,
    columnId: "pending",
    assigneeId: assignee.id,
    reporterId: user.id,
    dueAt: inferDueAt(plan.suggestedDueAt),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    location: plan.suggestedLocation ?? user.site,
    tags: ["whatsapp", "ia"],
    requiresChecklist: priority === "critical" || priority === "high",
  };

  runtime.state.tasks.unshift(task);
  if (task.requiresChecklist) {
    const checklist = buildChecklistForTask(task);
    task.checklistInstanceId = checklist.id;
    runtime.state.checklists.unshift(checklist);
  }

  appendActivity(runtime, user.id, `Creo por IA la tarea "${task.title}" y la asigno a ${assignee.name}`);
  return { task, assignee };
}

function createProspectFromMessage(runtime: RuntimeEnvelope, user: User, customerName: string, vehicleInterest: string) {
  if (!isSalesUser(user)) {
    return null;
  }

  const prospect: Prospect = {
    id: crypto.randomUUID(),
    groupId: user.groupId,
    brandId: user.brandId,
    siteId: user.siteId,
    customerName,
    salespersonId: user.role === "operator" ? user.id : runtime.state.users.find((candidate) => canManageCommercialEntity(user, candidate.site, candidate.id) && candidate.department === "sales")?.id ?? user.id,
    agency: user.site,
    source: "WhatsApp",
    status: "new",
    createdAt: nowIso(),
    nextActionAt: defaultSalesDueAt(),
    vehicleInterest,
    financingRequired: true,
    notes: `Prospecto creado por WhatsApp desde ${user.name}.`,
  };

  runtime.state.prospects.unshift(prospect);
  appendActivity(runtime, user.id, `Creo por WhatsApp el prospecto "${prospect.customerName}"`);
  return prospect;
}

function createOrUpdateTestDrive(runtime: RuntimeEnvelope, user: User, prospect: Prospect) {
  if (!canManageProspect(user, prospect)) {
    return null;
  }

  const scheduledAt = defaultSalesDueAt();
  const existing = runtime.state.testDrives.find((testDrive) => testDrive.prospectId === prospect.id && testDrive.status === "scheduled");
  if (existing) {
    existing.scheduledAt = scheduledAt;
    existing.vehicleModel = prospect.vehicleInterest;
    existing.agency = prospect.agency;
    existing.groupId = prospect.groupId;
    existing.brandId = prospect.brandId;
    existing.siteId = prospect.siteId;
    appendActivity(runtime, user.id, `Reagenda por WhatsApp la prueba de manejo de "${prospect.customerName}"`);
    return existing;
  }

  const testDrive: TestDrive = {
    id: crypto.randomUUID(),
    groupId: prospect.groupId,
    brandId: prospect.brandId,
    siteId: prospect.siteId,
    prospectId: prospect.id,
    salespersonId: prospect.salespersonId,
    agency: prospect.agency,
    vehicleModel: prospect.vehicleInterest,
    scheduledAt,
    status: "scheduled",
  };

  runtime.state.testDrives.unshift(testDrive);
  runtime.state.prospects = runtime.state.prospects.map((entry) =>
    entry.id === prospect.id ? { ...entry, status: "test_drive", nextActionAt: scheduledAt } : entry,
  );
  appendActivity(runtime, user.id, `Agenda por WhatsApp la prueba de manejo de "${prospect.customerName}"`);
  return testDrive;
}

function completeTestDrive(runtime: RuntimeEnvelope, user: User, testDrive: TestDrive) {
  if (!canManageTestDrive(user, testDrive)) {
    return false;
  }

  runtime.state.testDrives = runtime.state.testDrives.map((entry) =>
    entry.id === testDrive.id ? { ...entry, status: "completed", completedAt: nowIso() } : entry,
  );
  runtime.state.prospects = runtime.state.prospects.map((prospect) =>
    prospect.id === testDrive.prospectId ? { ...prospect, status: "negotiation" } : prospect,
  );
  runtime.state.salesOperations = runtime.state.salesOperations.map((operation) =>
    operation.prospectId === testDrive.prospectId ? { ...operation, stage: "negotiation", updatedAt: nowIso() } : operation,
  );
  appendActivity(runtime, user.id, `Completo por WhatsApp la prueba de manejo ${testDrive.id}`);
  return true;
}

function createSalesOperation(runtime: RuntimeEnvelope, user: User, prospect: Prospect) {
  if (!canManageProspect(user, prospect)) {
    return null;
  }
  const existing = runtime.state.salesOperations.find((operation) => operation.prospectId === prospect.id);
  if (existing) {
    return existing;
  }

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
    stage: prospect.status === "negotiation" ? "negotiation" : prospect.status === "test_drive" ? "test_drive" : "prospecting",
    source: prospect.source,
    financingRequired: prospect.financingRequired,
    financier: prospect.financingRequired ? "VWFS" : "Contado",
    subsidyType: "none",
    subsidyAmount: 0,
    tradeInRequired: normalizeText(prospect.notes).includes("usado"),
    closingProbability: prospect.status === "negotiation" ? 70 : 40,
    expectedCloseAt: prospect.nextActionAt ?? defaultSalesDueAt(),
    nextStep: "Actualizar negociacion y fecha estimada de cierre.",
    notes: prospect.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  runtime.state.salesOperations.unshift(operation);
  appendActivity(runtime, user.id, `Abre por WhatsApp la operacion ${operation.id} para "${prospect.customerName}"`);
  return operation;
}

function updateSalesOperationStageByCommand(runtime: RuntimeEnvelope, user: User, operation: SalesOperation, stage: SalesOperation["stage"]) {
  if (!canManageSalesOperation(user, operation)) {
    return false;
  }

  runtime.state.salesOperations = runtime.state.salesOperations.map((entry) =>
    entry.id === operation.id
      ? {
          ...entry,
          stage,
          updatedAt: nowIso(),
          closedAt: stage === "closed_won" || stage === "closed_lost" ? nowIso() : entry.closedAt,
        }
      : entry,
  );
  runtime.state.prospects = runtime.state.prospects.map((prospect) =>
    prospect.id === operation.prospectId
      ? {
          ...prospect,
          status:
            stage === "closed_won" ? "closed_won" : stage === "closed_lost" ? "closed_lost" : stage === "test_drive" ? "test_drive" : "negotiation",
        }
      : prospect,
  );
  if (
    stage === "closed_won" &&
    !runtime.state.postSaleFollowUps.some(
      (followUp) =>
        followUp.customerName === operation.customerName &&
        followUp.vehicleModel === operation.vehicleModel &&
        followUp.agency === operation.agency,
    )
  ) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 5);
    runtime.state.postSaleFollowUps.unshift({
      id: crypto.randomUUID(),
      groupId: operation.groupId,
      brandId: operation.brandId,
      siteId: operation.siteId,
      customerName: operation.customerName,
      vehicleModel: operation.vehicleModel,
      salespersonId: operation.salespersonId,
      agency: operation.agency,
      saleDate: nowIso(),
      dueAt: dueAt.toISOString(),
      status: "pending",
      nextStep: "Llamar a cliente y registrar experiencia de entrega.",
    });
  }
  appendActivity(runtime, user.id, `Mueve por WhatsApp la operacion ${operation.id} a ${stage}`);
  return true;
}

function createCreditFile(runtime: RuntimeEnvelope, user: User, operation: SalesOperation) {
  if (!canManageSalesOperation(user, operation) || !operation.financingRequired) {
    return null;
  }
  const existing = runtime.state.creditFiles.find((creditFile) => creditFile.operationId === operation.id);
  if (existing) {
    return existing;
  }

  const requiredDocuments = ["Solicitud firmada", "INE", "Comprobante de domicilio", "Estados de cuenta"];
  const creditFile: CreditFile = {
    id: crypto.randomUUID(),
    groupId: operation.groupId,
    brandId: operation.brandId,
    siteId: operation.siteId,
    operationId: operation.id,
    customerName: operation.customerName,
    agency: operation.agency,
    salespersonId: operation.salespersonId,
    financier: operation.financier,
    status: "collecting",
    downPaymentReady: false,
    requiredDocuments,
    receivedDocuments: [],
    missingDocuments: requiredDocuments,
    notes: `Expediente abierto por WhatsApp desde ${user.name}.`,
  };

  runtime.state.creditFiles.unshift(creditFile);
  runtime.state.salesOperations = runtime.state.salesOperations.map((entry) =>
    entry.id === operation.id ? { ...entry, stage: "credit_review", updatedAt: nowIso() } : entry,
  );
  appendActivity(runtime, user.id, `Abre por WhatsApp el expediente ${creditFile.id} de "${operation.customerName}"`);
  return creditFile;
}

function updateCreditFileStatusByCommand(runtime: RuntimeEnvelope, user: User, creditFile: CreditFile, status: CreditFile["status"]) {
  if (!canManageCreditFile(user, creditFile)) {
    return false;
  }

  runtime.state.creditFiles = runtime.state.creditFiles.map((entry) =>
    entry.id === creditFile.id
      ? {
          ...entry,
          status,
          submittedAt: status === "submitted" ? nowIso() : entry.submittedAt,
          decisionAt: status === "approved" || status === "rejected" ? nowIso() : entry.decisionAt,
        }
      : entry,
  );
  runtime.state.salesOperations = runtime.state.salesOperations.map((operation) =>
    operation.id === creditFile.operationId
      ? {
          ...operation,
          stage: status === "approved" ? "ready_to_close" : "credit_review",
          updatedAt: nowIso(),
        }
      : operation,
  );
  appendActivity(runtime, user.id, `Actualiza por WhatsApp el expediente ${creditFile.id} a ${status}`);
  return true;
}

function detectIncidentArea(value: string): BellIncident["area"] {
  const normalized = normalizeText(value);
  if (normalized.includes("serv")) {
    return "service";
  }
  if (normalized.includes("refacc") || normalized.includes("part")) {
    return "parts";
  }
  if (normalized.includes("admin")) {
    return "admin";
  }
  return "sales";
}

function detectIncidentSeverity(summary: string): BellIncident["severity"] {
  const normalized = normalizeText(summary);
  if (normalized.includes("grita") || normalized.includes("amenaza") || normalized.includes("urg") || normalized.includes("molest")) {
    return "critical";
  }
  if (normalized.includes("tarde") || normalized.includes("queja")) {
    return "warning";
  }
  return "info";
}

function createBellIncidentFromMessage(runtime: RuntimeEnvelope, user: User, customerName: string, areaRaw: string, summary: string) {
  const incident: BellIncident = {
    id: crypto.randomUUID(),
    groupId: user.groupId,
    brandId: user.brandId,
    siteId: user.siteId,
    customerName,
    agency: user.site,
    area: detectIncidentArea(areaRaw),
    severity: detectIncidentSeverity(summary),
    status: "open",
    summary,
    ownerId: user.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  runtime.state.bellIncidents.unshift(incident);
  appendAlert(runtime, `Campana activada: ${customerName}`, summary);
  appendActivity(runtime, user.id, `Levanto por WhatsApp el incidente de campana ${incident.id}`);
  return incident;
}

function updateBellIncidentByCommand(
  runtime: RuntimeEnvelope,
  user: User,
  incident: BellIncident,
  patch: Partial<Pick<BellIncident, "status" | "ownerId" | "resolutionNote">>,
) {
  const nextIncident = { ...incident, ...patch };
  if (!canManageBellIncident(user, nextIncident)) {
    return false;
  }

  runtime.state.bellIncidents = runtime.state.bellIncidents.map((entry) =>
    entry.id === incident.id
      ? {
          ...entry,
          ...patch,
          updatedAt: nowIso(),
        }
      : entry,
  );
  appendActivity(runtime, user.id, `Actualiza por WhatsApp el incidente ${incident.id} a ${patch.status ?? incident.status}`);
  return true;
}

function updatePostSaleFollowUpByCommand(
  runtime: RuntimeEnvelope,
  user: User,
  followUp: PostSaleFollowUp,
  status: PostSaleFollowUp["status"],
  nextStep?: string,
) {
  if (!canManagePostSaleFollowUp(user, followUp)) {
    return false;
  }

  runtime.state.postSaleFollowUps = runtime.state.postSaleFollowUps.map((entry) =>
    entry.id === followUp.id
      ? {
          ...entry,
          status,
          nextStep: nextStep ?? entry.nextStep,
          lastContactAt: status === "contacted" || status === "closed" ? nowIso() : entry.lastContactAt,
        }
      : entry,
  );
  appendActivity(runtime, user.id, `Actualiza por WhatsApp el seguimiento ${followUp.id} a ${status}`);
  return true;
}

function moveTask(runtime: RuntimeEnvelope, taskId: string, columnId: Task["columnId"], blockedReason?: string) {
  runtime.state.tasks = runtime.state.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          columnId,
          blockedReason: columnId === "blocked" ? blockedReason : undefined,
          updatedAt: nowIso(),
          completedAt: columnId === "done" ? nowIso() : undefined,
        }
      : task,
  );
}

function markChecklistItem(runtime: RuntimeEnvelope, taskId: string, itemPosition: number, actorId: string) {
  let updatedLabel = "";
  let ok = false;

  runtime.state.checklists = runtime.state.checklists.map((checklist) => {
    if (checklist.taskId !== taskId) {
      return checklist;
    }

    const item = checklist.items[itemPosition - 1];
    if (!item) {
      return checklist;
    }

    updatedLabel = item.label;
    ok = true;

    const nextItems = checklist.items.map((entry, index) =>
      index === itemPosition - 1
        ? {
            ...entry,
            done: true,
            completedAt: entry.completedAt ?? nowIso(),
          }
        : entry,
    );

    const allRequiredDone = nextItems.every((entry) => !entry.required || entry.done);

    return {
      ...checklist,
      items: nextItems,
      status: allRequiredDone ? "complete" : "in_progress",
    };
  });

  if (ok) {
    appendActivity(runtime, actorId, `Marco por WhatsApp el item "${updatedLabel}" del checklist de ${taskId}`);
  }

  return ok;
}

function showChecklist(runtime: RuntimeEnvelope, task: Task) {
  const checklist = getChecklistByTask(runtime, task.id);
  if (!checklist) {
    return `La tarea ${task.id} no tiene checklist.`;
  }

  return [
    `Checklist de ${task.id}:`,
    ...checklist.items.map((item, index) => `${index + 1}. [${item.done ? "x" : " "}] ${item.label}`),
  ].join("\n");
}

function buildContext(runtime: RuntimeEnvelope, user: User) {
  return JSON.stringify(
    {
      date: "2026-03-13",
      user: {
        name: user.name,
        role: user.role,
        site: user.site,
      },
      tasks: getVisibleTasks(runtime, user).slice(0, 8).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.columnId,
        dueAt: task.dueAt,
        location: task.location,
      })),
      alerts: runtime.state.alerts.slice(0, 5).map((alert) => ({
        title: alert.title,
        severity: alert.severity,
        read: alert.read,
      })),
      prospects: getVisibleProspects(runtime, user)
        .slice(0, 6)
        .map((prospect) => ({
          customerName: prospect.customerName,
          status: prospect.status,
          agency: prospect.agency,
          vehicleInterest: prospect.vehicleInterest,
        })),
      salesOperations: getVisibleSalesOperations(runtime, user)
        .slice(0, 6)
        .map((operation) => ({
          customerName: operation.customerName,
          stage: operation.stage,
          vehicleModel: operation.vehicleModel,
          closingProbability: operation.closingProbability,
        })),
      creditFiles: getVisibleCreditFiles(runtime, user)
        .slice(0, 4)
        .map((file) => ({
          customerName: file.customerName,
          status: file.status,
          missingDocuments: file.missingDocuments,
        })),
      notes: runtime.state.notes.slice(0, 5).map((note) => ({
        title: note.title,
        body: note.body,
      })),
      latestReports: runtime.state.reports.slice(0, 3).map((report) => ({
        kind: report.kind,
        title: report.title,
      })),
    },
    null,
    2,
  );
}

function fallbackExtraction(runtime: RuntimeEnvelope, user: User, message: string): OperationalExtraction {
  const normalized = normalizeText(message);
  const matchedTasks = getVisibleTasks(runtime, user)
    .filter((task) => normalized.includes(normalizeText(task.id)) || normalized.includes(normalizeText(task.title).slice(0, 10)))
    .map((task) => `${task.id}: ${task.title}`);

  const targetUser =
    runtime.state.users.find(
      (entry) => canViewUserProfile(user, entry) && normalized.includes(normalizeText(entry.name.split(" ")[0])),
    )?.name ?? null;

  let requestedReport: ReportKind | null = null;
  if (normalized.includes("reporte bloque")) requestedReport = "blockers";
  else if (normalized.includes("reporte cierre") || normalized.includes("cierre del dia")) requestedReport = "daily_closure";
  else if (normalized.startsWith("reporte ") && targetUser) requestedReport = "team_member";
  else if (normalized.includes("reporte") || normalized.includes("resumen")) requestedReport = "general";

  const createTaskIntent = normalized.startsWith("crea tarea") || normalized.startsWith("asigna tarea");
  const noteIntent = normalized.startsWith("nota") || normalized.startsWith("recuerda");

  return {
    intent: createTaskIntent ? "create_task" : noteIntent ? "save_note" : requestedReport ? "report_request" : "free_text",
    summary: message.trim(),
    detectedTasks: matchedTasks,
    blockers: normalized.includes("falta") ? [message.trim()] : [],
    followUps: normalized.includes("urge") ? ["Atender con prioridad alta"] : [],
    requestedReport,
    targetUserName: targetUser,
    note: noteIntent ? message.replace(/^(nota|recuerda)\s*/i, "").trim() : null,
    suggestedTaskTitle: createTaskIntent ? message.replace(/^(crea|asigna)\s+tarea\s*/i, "").trim() || "Nueva tarea operativa" : null,
    suggestedTaskDescription: createTaskIntent ? `Tarea generada desde WhatsApp por ${user.name}.` : null,
    suggestedAssigneeName: targetUser,
    suggestedPriority: normalized.includes("urg") ? "high" : "medium",
    suggestedDueAt: null,
    suggestedLocation: null,
    wantsSuggestions: normalized.includes("sugerencia") || normalized.includes("recomiendas"),
  };
}

async function analyzeMessage(runtime: RuntimeEnvelope, user: User, message: string) {
  const fallback = fallbackExtraction(runtime, user, message);

  if (!geminiEnabled()) {
    return fallback;
  }

  try {
    const analysis = await generateGeminiJson({
      schema: extractionSchema,
      systemPrompt:
        "Eres un analista operativo de Capataz AI. Clasifica mensajes de WhatsApp de negocio en espanol mexicano. Detecta si el usuario quiere crear tarea, guardar nota, pedir reporte o sugerencias. Si propones fecha, usa ISO UTC.",
      userPrompt: [
        `Mensaje: ${message}`,
        "Contexto del usuario y negocio:",
        buildContext(runtime, user),
        "Reglas:",
        '- requestedReport solo puede ser "general", "daily_closure", "blockers", "team_member" o null.',
        "- suggestedPriority solo puede ser low, medium, high o critical.",
        "- suggestedDueAt debe ser ISO UTC o null.",
      ].join("\n\n"),
      maxOutputTokens: 700,
    });

    return analysis ?? fallback;
  } catch {
    return fallback;
  }
}

function renderExtraction(extraction: OperationalExtraction) {
  const parts = [`Separacion operativa:`, `- resumen: ${extraction.summary}`];

  if (extraction.detectedTasks.length) parts.push(`- tareas detectadas: ${extraction.detectedTasks.join(" | ")}`);
  if (extraction.blockers.length) parts.push(`- bloqueos: ${extraction.blockers.join(" | ")}`);
  if (extraction.followUps.length) parts.push(`- seguimiento: ${extraction.followUps.join(" | ")}`);
  if (extraction.note) parts.push(`- memoria: ${extraction.note}`);
  if (extraction.requestedReport) parts.push(`- reporte solicitado: ${extraction.requestedReport}`);
  if (extraction.suggestedTaskTitle) parts.push(`- tarea propuesta: ${extraction.suggestedTaskTitle}`);

  return parts.join("\n");
}

async function refineReportWithGemini(report: GeneratedReport, runtime: RuntimeEnvelope, user: User) {
  if (!geminiEnabled()) {
    return report;
  }

  try {
    const body = await generateGeminiText({
      systemPrompt:
        "Eres Capataz AI. Reescribe reportes operativos en espanol mexicano claro, corto y accionable. No inventes datos.",
      userPrompt: [`Usuario: ${user.name}`, "Contexto:", buildContext(runtime, user), "Reporte base:", report.body].join("\n\n"),
      maxOutputTokens: 500,
    });

    return body ? { ...report, body } : report;
  } catch {
    return report;
  }
}

async function maybeGenerateReport(runtime: RuntimeEnvelope, user: User, extraction: OperationalExtraction) {
  if (!extraction.requestedReport) {
    return null;
  }

  if (extraction.requestedReport === "general") {
    return refineReportWithGemini(generateGeneralReport(runtime, user), runtime, user);
  }
  if (extraction.requestedReport === "blockers") {
    return refineReportWithGemini(generateBlockersReport(runtime, user), runtime, user);
  }
  if (extraction.requestedReport === "daily_closure") {
    return refineReportWithGemini(generateDailyClosureReport(runtime, user), runtime, user);
  }

  const targetUser = findVisibleUserByName(runtime, user, extraction.targetUserName);
  return targetUser ? refineReportWithGemini(generateUserReport(runtime, targetUser), runtime, user) : null;
}

function ensureThread(runtime: RuntimeEnvelope, phone: string, channel: CapatazChannel) {
  const key = getThreadKey(phone, channel);
  const existing = runtime.threads[key];
  if (existing) {
    return existing;
  }

  const user = getUserByPhone(runtime, phone);
  const thread: ConversationThread = {
    channel,
    phone,
    userId: user?.id ?? null,
    latestAnalysis: null,
    latestReport: null,
    messages: [
      {
        id: crypto.randomUUID(),
        role: "system",
        text: user
          ? `Canal listo para ${user.name}. Usa "ayuda" si quieres ver comandos.`
          : "Numero no reconocido todavia. Asigna este telefono a un colaborador antes de operar.",
        createdAt: nowIso(),
      },
    ],
  };

  runtime.threads[key] = thread;
  return thread;
}

function appendMessage(thread: ConversationThread, role: ConversationMessage["role"], text: string) {
  thread.messages.push({
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: nowIso(),
  });
}

function snapshotFromThread(runtime: RuntimeEnvelope, thread: ConversationThread, user: User | null) {
  const metrics = collectMetrics(runtime, user);

  return {
    channel: thread.channel,
    phone: thread.phone,
    user: user
      ? {
          id: user.id,
          name: user.name,
          role: user.role,
          site: user.site,
        }
      : null,
    mode: geminiEnabled() ? "gemini" : "rules",
    latestAnalysis: thread.latestAnalysis,
    latestReport: thread.latestReport,
    latestNotes: runtime.state.notes.slice(0, 5),
    latestSuggestions: runtime.state.suggestions.slice(0, 5),
    stats: {
      openTasks: metrics.openTasks.length,
      blockedTasks: metrics.blockedTasks.length,
      overdueTasks: metrics.overdueTasks.length,
      unreadAlerts: metrics.unreadAlerts.length,
      totalNotes: runtime.state.notes.length,
      totalReports: runtime.state.reports.length,
    },
    messages: [...thread.messages],
  };
}

function executeRules(runtime: RuntimeEnvelope, user: User, message: string): ActionResult {
  const normalized = normalizeText(message);

  if (!normalized || normalized === "ayuda" || normalized === "help") {
    return { intent: "help", reply: helpMessage(user) };
  }

  if (normalized.includes("mis tareas") || normalized === "pendientes") {
    return { intent: "list_tasks", reply: summarizeTasksForUser(runtime, user) };
  }

  if (normalized === "mis prospectos" || normalized === "prospectos") {
    return { intent: "list_prospects", reply: summarizeProspectsForUser(runtime, user) };
  }

  if (normalized === "operaciones" || normalized === "mis operaciones") {
    return { intent: "list_operations", reply: summarizeOperationsForUser(runtime, user) };
  }

  if (normalized === "expedientes" || normalized === "mis expedientes") {
    return { intent: "list_credit_files", reply: summarizeCreditFilesForUser(runtime, user) };
  }

  if (normalized === "campana" || normalized === "mis incidentes") {
    return { intent: "list_incidents", reply: summarizeIncidentsForUser(runtime, user) };
  }

  if (normalized === "mis seguimientos" || normalized === "seguimientos" || normalized === "postventa") {
    return { intent: "list_post_sale", reply: summarizePostSaleForUser(runtime, user) };
  }

  const createBellIncidentMatch = message.match(
    /^(?:levantar|levanta|crear|crea)\s+campana\s+(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/i,
  );
  if (createBellIncidentMatch) {
    const incident = createBellIncidentFromMessage(
      runtime,
      user,
      createBellIncidentMatch[1].trim(),
      createBellIncidentMatch[2].trim(),
      createBellIncidentMatch[3].trim(),
    );
    return {
      intent: "create_bell_incident",
      action: "bell_incident_created",
      reply: `Listo. Levante la campana ${incident.id} para ${incident.customerName} en ${incident.area}.`,
    };
  }

  const customerBellMatch = message.match(/^cliente\s+toco\s+campana\s+(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/i);
  if (customerBellMatch) {
    const incident = createBellIncidentFromMessage(
      runtime,
      user,
      customerBellMatch[1].trim(),
      customerBellMatch[2].trim(),
      customerBellMatch[3].trim(),
    );
    return {
      intent: "create_bell_incident",
      action: "bell_incident_created",
      reply: `Listo. Ya quedo levantado el incidente ${incident.id} y alertado el sitio.`,
    };
  }

  const takeBellMatch = message.match(/^(?:tomar|atiende|atender)\s+campana\s+(.+)$/i);
  if (takeBellMatch) {
    const incident = findBellIncidentByReference(runtime, user, takeBellMatch[1]);
    if (!incident) {
      return { intent: "take_bell_incident", reply: `No encontre el incidente "${takeBellMatch[1]}".` };
    }
    const ok = updateBellIncidentByCommand(runtime, user, incident, { status: "in_progress", ownerId: user.id });
    return ok
      ? {
          intent: "take_bell_incident",
          action: "bell_incident_taken",
          reply: `Listo. Tome la campana ${incident.id} y ya quedo en atencion.`,
        }
      : { intent: "take_bell_incident", reply: "No puedes tomar esa campana con tu alcance actual." };
  }

  const resolveBellMatch = message.match(/^(?:resolver|resuelve)\s+campana\s+(.+?)(?:\s*\|\s*(.+))?$/i);
  if (resolveBellMatch) {
    const incident = findBellIncidentByReference(runtime, user, resolveBellMatch[1]);
    if (!incident) {
      return { intent: "resolve_bell_incident", reply: `No encontre el incidente "${resolveBellMatch[1]}".` };
    }
    const ok = updateBellIncidentByCommand(runtime, user, incident, {
      status: "resolved",
      ownerId: user.id,
      resolutionNote: resolveBellMatch[2]?.trim() || "Cliente atendido y caso cerrado por WhatsApp.",
    });
    return ok
      ? {
          intent: "resolve_bell_incident",
          action: "bell_incident_resolved",
          reply: `Listo. La campana ${incident.id} quedo resuelta.`,
        }
      : { intent: "resolve_bell_incident", reply: "No puedes resolver esa campana con tu alcance actual." };
  }

  const createProspectMatch = message.match(/^(?:crear|crea|nuevo)\s+prospecto\s+(.+?)(?:\s*\|\s*(.+))?$/i);
  if (createProspectMatch) {
    if (!isSalesUser(user)) {
      return { intent: "create_prospect", reply: "Tu perfil no puede crear prospectos comerciales." };
    }

    const customerName = createProspectMatch[1]?.trim();
    const vehicleInterest = createProspectMatch[2]?.trim() || "Modelo por confirmar";
    if (!customerName) {
      return { intent: "create_prospect", reply: "Necesito al menos el nombre del prospecto. Ejemplo: crear prospecto Mario Cazares | Taos Highline" };
    }

    const prospect = createProspectFromMessage(runtime, user, customerName, vehicleInterest);
    return prospect
      ? {
          intent: "create_prospect",
          action: "prospect_created",
          reply: `Listo. Cree el prospecto ${prospect.id} para ${prospect.customerName} con interes en ${prospect.vehicleInterest}.`,
        }
      : { intent: "create_prospect", reply: "No pude crear el prospecto con tu alcance actual." };
  }

  const scheduleTestDriveMatch = message.match(/^(?:agendar|agenda|programa)\s+prueba\s+(.+)$/i);
  if (scheduleTestDriveMatch) {
    const prospect = findProspectByReference(runtime, user, scheduleTestDriveMatch[1]);
    if (!prospect) {
      return { intent: "schedule_test_drive", reply: `No encontre el prospecto "${scheduleTestDriveMatch[1]}".` };
    }
    const testDrive = createOrUpdateTestDrive(runtime, user, prospect);
    return testDrive
      ? {
          intent: "schedule_test_drive",
          action: "test_drive_scheduled",
          reply: `Listo. Agende la prueba ${testDrive.id} para ${prospect.customerName} el ${testDrive.scheduledAt.slice(0, 16).replace("T", " ")}.`,
        }
      : { intent: "schedule_test_drive", reply: "No puedes agendar esa prueba con tu alcance actual." };
  }

  const completeTestDriveMatch = message.match(/^(?:completar|completa|cerrar)\s+prueba\s+(.+)$/i);
  if (completeTestDriveMatch) {
    const testDrive =
      findTestDriveByReference(runtime, user, completeTestDriveMatch[1]) ??
      (() => {
        const prospect = findProspectByReference(runtime, user, completeTestDriveMatch[1]);
        return prospect ? getVisibleTestDrives(runtime, user).find((entry) => entry.prospectId === prospect.id) ?? null : null;
      })();
    if (!testDrive) {
      return { intent: "complete_test_drive", reply: `No encontre la prueba "${completeTestDriveMatch[1]}".` };
    }
    const ok = completeTestDrive(runtime, user, testDrive);
    return ok
      ? { intent: "complete_test_drive", action: "test_drive_completed", reply: `Listo. La prueba ${testDrive.id} quedo como completada.` }
      : { intent: "complete_test_drive", reply: "No puedes cerrar esa prueba con tu alcance actual." };
  }

  const createOperationMatch = message.match(/^(?:abrir|crear|crea)\s+operacion\s+(.+)$/i);
  if (createOperationMatch) {
    const prospect = findProspectByReference(runtime, user, createOperationMatch[1]);
    if (!prospect) {
      return { intent: "create_operation", reply: `No encontre el prospecto "${createOperationMatch[1]}".` };
    }
    const operation = createSalesOperation(runtime, user, prospect);
    return operation
      ? { intent: "create_operation", action: "operation_created", reply: `Listo. Abri la operacion ${operation.id} para ${operation.customerName}.` }
      : { intent: "create_operation", reply: "No pude abrir la operacion con tu alcance actual." };
  }

  const moveOperationMatch = message.match(/^(?:mover|pasar|avanzar)\s+operacion\s+(\S+)\s+a\s+(.+)$/i);
  if (moveOperationMatch) {
    const operation = findSalesOperationByReference(runtime, user, moveOperationMatch[1]);
    if (!operation) {
      return { intent: "move_operation", reply: `No encontre la operacion "${moveOperationMatch[1]}".` };
    }

    const target = normalizeText(moveOperationMatch[2]);
    const stage: SalesOperation["stage"] =
      target.includes("cierre") ? "ready_to_close" : target.includes("credito") ? "credit_review" : target.includes("gan") ? "closed_won" : target.includes("perd") ? "closed_lost" : target.includes("prueba") ? "test_drive" : "negotiation";
    const ok = updateSalesOperationStageByCommand(runtime, user, operation, stage);
    return ok
      ? { intent: "move_operation", action: "operation_updated", reply: `Listo. La operacion ${operation.id} ahora esta en ${stage}.` }
      : { intent: "move_operation", reply: "No puedes mover esa operacion con tu alcance actual." };
  }

  const openCreditFileMatch = message.match(/^(?:expediente|abrir expediente)\s+(.+)$/i);
  if (openCreditFileMatch) {
    const operation = findSalesOperationByReference(runtime, user, openCreditFileMatch[1]);
    if (!operation) {
      return { intent: "open_credit_file", reply: `No encontre la operacion "${openCreditFileMatch[1]}".` };
    }
    const creditFile = createCreditFile(runtime, user, operation);
    return creditFile
      ? { intent: "open_credit_file", action: "credit_file_opened", reply: `Listo. El expediente ${creditFile.id} ya esta abierto para ${creditFile.customerName}.` }
      : { intent: "open_credit_file", reply: "No pude abrir ese expediente con tu alcance actual o la operacion es de contado." };
  }

  const sendCreditFileMatch = message.match(/^(?:enviar|manda)\s+expediente\s+(.+)$/i);
  if (sendCreditFileMatch) {
    const creditFile =
      findCreditFileByReference(runtime, user, sendCreditFileMatch[1]) ??
      (() => {
        const operation = findSalesOperationByReference(runtime, user, sendCreditFileMatch[1]);
        return operation ? getVisibleCreditFiles(runtime, user).find((entry) => entry.operationId === operation.id) ?? null : null;
      })();
    if (!creditFile) {
      return { intent: "submit_credit_file", reply: `No encontre el expediente "${sendCreditFileMatch[1]}".` };
    }
    const ok = updateCreditFileStatusByCommand(runtime, user, creditFile, "submitted");
    return ok
      ? { intent: "submit_credit_file", action: "credit_file_submitted", reply: `Listo. El expediente ${creditFile.id} quedo enviado.` }
      : { intent: "submit_credit_file", reply: "No puedes enviar ese expediente con tu alcance actual." };
  }

  const approveCreditFileMatch = message.match(/^(?:aprobar|aprueba)\s+expediente\s+(.+)$/i);
  if (approveCreditFileMatch) {
    const creditFile = findCreditFileByReference(runtime, user, approveCreditFileMatch[1]);
    if (!creditFile) {
      return { intent: "approve_credit_file", reply: `No encontre el expediente "${approveCreditFileMatch[1]}".` };
    }
    const ok = updateCreditFileStatusByCommand(runtime, user, creditFile, "approved");
    return ok
      ? { intent: "approve_credit_file", action: "credit_file_approved", reply: `Listo. El expediente ${creditFile.id} quedo aprobado.` }
      : { intent: "approve_credit_file", reply: "No puedes aprobar ese expediente con tu alcance actual." };
  }

  const rejectCreditFileMatch = message.match(/^(?:rechazar|rechaza)\s+expediente\s+(.+)$/i);
  if (rejectCreditFileMatch) {
    const creditFile = findCreditFileByReference(runtime, user, rejectCreditFileMatch[1]);
    if (!creditFile) {
      return { intent: "reject_credit_file", reply: `No encontre el expediente "${rejectCreditFileMatch[1]}".` };
    }
    const ok = updateCreditFileStatusByCommand(runtime, user, creditFile, "rejected");
    return ok
      ? { intent: "reject_credit_file", action: "credit_file_rejected", reply: `Listo. El expediente ${creditFile.id} quedo rechazado.` }
      : { intent: "reject_credit_file", reply: "No puedes rechazar ese expediente con tu alcance actual." };
  }

  const contactFollowUpMatch = message.match(/^(?:contactar|contacta|llama|llamar)\s+seguimiento\s+(.+)$/i);
  if (contactFollowUpMatch) {
    const followUp = findPostSaleFollowUpByReference(runtime, user, contactFollowUpMatch[1]);
    if (!followUp) {
      return { intent: "contact_post_sale", reply: `No encontre el seguimiento "${contactFollowUpMatch[1]}".` };
    }
    const ok = updatePostSaleFollowUpByCommand(runtime, user, followUp, "contacted");
    return ok
      ? {
          intent: "contact_post_sale",
          action: "post_sale_contacted",
          reply: `Listo. El seguimiento ${followUp.id} quedo como contactado.`,
        }
      : { intent: "contact_post_sale", reply: "No puedes actualizar ese seguimiento con tu alcance actual." };
  }

  const atRiskFollowUpMatch = message.match(/^(?:riesgo|marcar riesgo|marca riesgo)\s+seguimiento\s+(.+)$/i);
  if (atRiskFollowUpMatch) {
    const followUp = findPostSaleFollowUpByReference(runtime, user, atRiskFollowUpMatch[1]);
    if (!followUp) {
      return { intent: "at_risk_post_sale", reply: `No encontre el seguimiento "${atRiskFollowUpMatch[1]}".` };
    }
    const ok = updatePostSaleFollowUpByCommand(runtime, user, followUp, "at_risk", "Cliente con riesgo de fuga; revisar seguimiento personal.");
    return ok
      ? {
          intent: "at_risk_post_sale",
          action: "post_sale_at_risk",
          reply: `Listo. El seguimiento ${followUp.id} quedo en riesgo.`,
        }
      : { intent: "at_risk_post_sale", reply: "No puedes actualizar ese seguimiento con tu alcance actual." };
  }

  const closeFollowUpMatch = message.match(/^(?:cerrar|cierra|resolver|resuelve)\s+seguimiento\s+(.+)$/i);
  if (closeFollowUpMatch) {
    const followUp = findPostSaleFollowUpByReference(runtime, user, closeFollowUpMatch[1]);
    if (!followUp) {
      return { intent: "close_post_sale", reply: `No encontre el seguimiento "${closeFollowUpMatch[1]}".` };
    }
    const ok = updatePostSaleFollowUpByCommand(runtime, user, followUp, "closed", "Seguimiento cerrado y cliente retenido.");
    return ok
      ? {
          intent: "close_post_sale",
          action: "post_sale_closed",
          reply: `Listo. El seguimiento ${followUp.id} quedo cerrado.`,
        }
      : { intent: "close_post_sale", reply: "No puedes cerrar ese seguimiento con tu alcance actual." };
  }

  if (normalized === "resumen" || normalized.includes("como vamos") || normalized.includes("estado del negocio")) {
    const report = generateGeneralReport(runtime, user);
    return { intent: "business_summary", reply: `${summarizeBusiness(runtime, user)}\n\n${report.body}`, report };
  }

  if (normalized === "reporte general") {
    const report = generateGeneralReport(runtime, user);
    return { intent: "report_general", reply: `${report.title}\n\n${report.body}`, report };
  }

  if (normalized === "reporte bloqueos") {
    const report = generateBlockersReport(runtime, user);
    return { intent: "report_blockers", reply: `${report.title}\n\n${report.body}`, report };
  }

  if (normalized === "reporte cierre" || normalized === "cierre del dia") {
    const report = generateDailyClosureReport(runtime, user);
    return { intent: "report_closure", reply: `${report.title}\n\n${report.body}`, report };
  }

  const namedReportMatch = normalized.match(/^reporte\s+(.+)$/);
  if (namedReportMatch) {
    const targetUser = findVisibleUserByName(runtime, user, namedReportMatch[1]);
    if (targetUser) {
      const report = generateUserReport(runtime, targetUser);
      return { intent: "report_user", reply: `${report.title}\n\n${report.body}`, report };
    }
  }

  if (normalized === "sugerencias" || normalized === "que recomiendas" || normalized === "recomendaciones") {
    const suggestions = generateSuggestions(runtime, user);
    return {
      intent: "suggestions",
      suggestions,
      reply: ["Sugerencias del Capataz:", ...suggestions.map((item) => `- ${item.title}: ${item.body}`)].join("\n"),
    };
  }

  if (normalized.startsWith("nota ") || normalized.startsWith("recuerda ")) {
    const body = message.replace(/^(nota|recuerda)\s*/i, "").trim();
    const note = appendNote(runtime, {
      createdByUserId: user.id,
      source: "user_message",
      title: body.slice(0, 64) || "Nota operativa",
      body,
    });
    appendActivity(runtime, user.id, `Registro por WhatsApp una nota operativa: ${note.title}`);
    return { intent: "save_note", note, reply: `Listo. Guarde la nota: ${note.title}` };
  }

  const checklistItemMatch = normalized.match(/^(?:check|item)\s+(\S+)\s+(\d+)$/);
  if (checklistItemMatch) {
    const [, reference, itemPositionRaw] = checklistItemMatch;
    const task = findTaskByReference(runtime, user, reference);
    if (!task) {
      return { intent: "check_item", reply: `No encontre la tarea "${reference}".` };
    }

    const itemPosition = Number(itemPositionRaw);
    const ok = markChecklistItem(runtime, task.id, itemPosition, user.id);
    if (!ok) {
      return { intent: "check_item", reply: `No encontre el item ${itemPosition} en el checklist de ${task.id}. Usa "checklist ${task.id}" para verlo.` };
    }

    return { intent: "check_item", action: "checklist_updated", reply: `Listo. Marque el item ${itemPosition} del checklist de ${task.id}.` };
  }

  const checklistMatch = normalized.match(/^checklist\s+(.+)$/);
  if (checklistMatch) {
    const task = findTaskByReference(runtime, user, checklistMatch[1]);
    if (!task) {
      return { intent: "show_checklist", reply: `No encontre la tarea "${checklistMatch[1]}".` };
    }
    return { intent: "show_checklist", reply: showChecklist(runtime, task) };
  }

  const startMatch = normalized.match(/^(?:iniciar|empieza|start)\s+(.+)$/);
  if (startMatch) {
    const task = findTaskByReference(runtime, user, startMatch[1]);
    if (!task) {
      return { intent: "start_task", reply: `No encontre la tarea "${startMatch[1]}".` };
    }
    if (!canMoveTaskByScope(user, task, runtime.state.users)) {
      return { intent: "start_task", reply: "No puedes mover esa tarea con tu alcance actual." };
    }
    moveTask(runtime, task.id, "in_progress");
    appendActivity(runtime, user.id, `Inicio por WhatsApp la tarea ${task.id}`);
    return { intent: "start_task", action: "task_started", reply: `Ya deje ${task.id} en proceso.` };
  }

  const completeMatch = normalized.match(/^(?:completar|terminar|cerrar|complete)\s+(.+)$/);
  if (completeMatch) {
    const task = findTaskByReference(runtime, user, completeMatch[1]);
    if (!task) {
      return { intent: "complete_task", reply: `No encontre la tarea "${completeMatch[1]}".` };
    }
    if (!canMoveTaskByScope(user, task, runtime.state.users)) {
      return { intent: "complete_task", reply: "No puedes cerrar esa tarea con tu alcance actual." };
    }
    const checklist = getChecklistByTask(runtime, task.id);
    const checklistComplete = checklist ? checklist.items.every((item) => !item.required || item.done) : true;
    if (!checklistComplete) {
      appendAlert(runtime, "Cierre bloqueado por checklist", `No se pudo cerrar ${task.id} porque faltan items del checklist.`, task.id);
      return { intent: "complete_task", reply: `No puedo cerrar ${task.id} todavia. Primero completa el checklist con "check ${task.id} <numero>" o revisa "checklist ${task.id}".` };
    }
    moveTask(runtime, task.id, "done");
    appendActivity(runtime, user.id, `Cerro por WhatsApp la tarea ${task.id}`);
    return { intent: "complete_task", action: "task_completed", reply: `Listo. ${task.id} quedo marcada como completada.` };
  }

  const blockMatch = normalized.match(/^(?:bloquear|bloqueo|block)\s+(\S+)\s+(.+)$/);
  if (blockMatch) {
    const task = findTaskByReference(runtime, user, blockMatch[1]);
    if (!task) {
      return { intent: "block_task", reply: `No encontre la tarea "${blockMatch[1]}".` };
    }
    if (!canMoveTaskByScope(user, task, runtime.state.users)) {
      return { intent: "block_task", reply: "No puedes bloquear esa tarea con tu alcance actual." };
    }
    moveTask(runtime, task.id, "blocked", blockMatch[2]);
    appendAlert(runtime, `Bloqueo reportado en ${task.id}`, blockMatch[2], task.id);
    appendActivity(runtime, user.id, `Bloqueo por WhatsApp la tarea ${task.id}: ${blockMatch[2]}`);
    return { intent: "block_task", action: "task_blocked", reply: `Quedo bloqueada ${task.id}. Ya registre el motivo: ${blockMatch[2]}` };
  }

  return { intent: "free_text" };
}

async function applyAutomation(runtime: RuntimeEnvelope, user: User, extraction: OperationalExtraction) {
  if (extraction.note) {
    const note = appendNote(runtime, {
      createdByUserId: user.id,
      source: "assistant_summary",
      title: extraction.note.slice(0, 64) || "Memoria operativa",
      body: extraction.note,
    });
    appendActivity(runtime, user.id, `Capataz guardo una memoria operativa: ${note.title}`);
    return { note };
  }

  if (extraction.intent === "create_task" && extraction.suggestedTaskTitle) {
    const created = createTaskFromPlan(runtime, user, extraction);
    if (created) {
      return {
        reply: `Cree la tarea "${created.task.title}" para ${created.assignee.name}. Vence ${created.task.dueAt.slice(0, 16).replace("T", " ")}.`,
      };
    }
  }

  if (extraction.wantsSuggestions) {
    const suggestions = generateSuggestions(runtime, user);
    return {
      suggestions,
      reply: ["Sugerencias del Capataz:", ...suggestions.map((item) => `- ${item.title}: ${item.body}`)].join("\n"),
    };
  }

  return {};
}

async function generateAssistantReply(
  runtime: RuntimeEnvelope,
  user: User,
  message: string,
  extraction: OperationalExtraction,
  report: GeneratedReport | null,
  suggestions: OperationalSuggestion[],
) {
  const baseline = [renderExtraction(extraction)];

  if (report) {
    baseline.push(`${report.title}\n\n${report.body}`);
  }

  if (suggestions.length) {
    baseline.push(["Sugerencias:", ...suggestions.map((item) => `- ${item.title}: ${item.body}`)].join("\n"));
  }

  if (!geminiEnabled()) {
    return baseline.join("\n\n");
  }

  try {
    const reply = await generateGeminiText({
      systemPrompt:
        "Eres Capataz AI Operativo. Responde en espanol mexicano, corto y accionable. Si ya existe separacion, reporte o sugerencias, usa eso como base y no inventes datos.",
      userPrompt: [
        `Mensaje del usuario: ${message}`,
        "Contexto del negocio:",
        buildContext(runtime, user),
        "Analisis detectado:",
        JSON.stringify(extraction, null, 2),
        report ? `Reporte generado:\n${report.title}\n${report.body}` : "No se genero reporte.",
        suggestions.length ? `Sugerencias:\n${suggestions.map((item) => `- ${item.title}: ${item.body}`).join("\n")}` : "Sin sugerencias.",
      ].join("\n\n"),
      maxOutputTokens: 600,
    });

    return reply ?? baseline.join("\n\n");
  } catch {
    return baseline.join("\n\n");
  }
}

export function getPublicCollaboratorContacts(): PublicCollaboratorContact[] {
  return seedData.users
    .filter((user) => Boolean(user.phone))
    .map((user) => ({
      userId: user.id,
      name: user.name,
      role: user.role,
      site: user.site,
      phone: user.phone as string,
    }));
}

export async function getConversationSnapshot(phone: string, channel: CapatazChannel = "mock_whatsapp") {
  const runtime = await refreshRuntime();
  const thread = ensureThread(runtime, phone, channel);
  const user = getUserByPhone(runtime, phone);
  return snapshotFromThread(runtime, thread, user);
}

export async function handleCapatazMessage({
  phone,
  text,
  channel = "mock_whatsapp",
}: {
  phone: string;
  text: string;
  channel?: CapatazChannel;
}) {
  const runtime = await refreshRuntime();
  const thread = ensureThread(runtime, phone, channel);
  const user = getUserByPhone(runtime, phone);

  appendMessage(thread, "user", text);

  if (!user) {
    const reply =
      "Todavia no reconozco este numero dentro del negocio. Primero registra al colaborador y despues volvemos a intentar.";
    appendMessage(thread, "assistant", reply);
    await persistRuntime();
    return {
      ok: false,
      reply,
      intent: "unknown_user",
      ...snapshotFromThread(runtime, thread, null),
    };
  }

  const extraction = await analyzeMessage(runtime, user, text);
  const ruleResult = executeRules(runtime, user, text);
  const automation = ruleResult.reply ? {} : await applyAutomation(runtime, user, extraction);
  const report = ruleResult.report ?? (await maybeGenerateReport(runtime, user, extraction));
  const suggestions = ruleResult.suggestions ?? automation.suggestions ?? [];
  const reply =
    ruleResult.reply ??
    automation.reply ??
    (await generateAssistantReply(runtime, user, text, extraction, report, suggestions));

  thread.latestAnalysis = extraction;
  thread.latestReport = report ?? null;
  appendMessage(thread, "assistant", reply);
  await persistRuntime();

  return {
    ok: true,
    reply,
    intent: ruleResult.intent,
    action: ruleResult.action ?? null,
    report,
    note: ruleResult.note ?? automation.note ?? null,
    ...snapshotFromThread(runtime, thread, user),
  };
}

export async function registerOutboundAssistantMessage({
  phone,
  text,
  channel = "mock_whatsapp",
}: {
  phone: string;
  text: string;
  channel?: CapatazChannel;
}) {
  const runtime = await refreshRuntime();
  const thread = ensureThread(runtime, phone, channel);
  const user = getUserByPhone(runtime, phone);
  appendMessage(thread, "assistant", text);
  await persistRuntime();
  return snapshotFromThread(runtime, thread, user);
}

export async function getRuntimeSyncPayload(): Promise<RuntimeSyncPayload> {
  const runtime = await refreshRuntime();
  return hydrateRuntimePayload({
    users: runtime.state.users,
    tasks: runtime.state.tasks,
    checklists: runtime.state.checklists,
    alerts: runtime.state.alerts,
    activity: runtime.state.activity as ActivityEntry[],
    prospects: runtime.state.prospects,
    testDrives: runtime.state.testDrives,
    salesOperations: runtime.state.salesOperations,
    creditFiles: runtime.state.creditFiles,
    bellIncidents: runtime.state.bellIncidents,
    postSaleFollowUps: runtime.state.postSaleFollowUps,
    scheduledBroadcasts: runtime.state.scheduledBroadcasts,
    reports: runtime.state.reports,
    notes: runtime.state.notes,
    suggestions: runtime.state.suggestions,
  });
}

export async function replaceRuntimeSyncPayload(payload: RuntimeSyncPayload) {
  const runtime = await refreshRuntime();
  const hydratedPayload = hydrateRuntimePayload(payload);
  runtime.state.users = hydratedPayload.users;
  runtime.state.tasks = payload.tasks;
  runtime.state.checklists = payload.checklists;
  runtime.state.alerts = payload.alerts;
  runtime.state.activity = payload.activity;
  runtime.state.prospects = hydratedPayload.prospects;
  runtime.state.testDrives = hydratedPayload.testDrives;
  runtime.state.salesOperations = hydratedPayload.salesOperations;
  runtime.state.creditFiles = hydratedPayload.creditFiles;
  runtime.state.bellIncidents = hydratedPayload.bellIncidents;
  runtime.state.postSaleFollowUps = hydratedPayload.postSaleFollowUps;
  runtime.state.scheduledBroadcasts = hydratedPayload.scheduledBroadcasts;
  runtime.state.reports = hydratedPayload.reports;
  runtime.state.notes = hydratedPayload.notes;
  runtime.state.suggestions = hydratedPayload.suggestions;
  await persistRuntime();
  return getRuntimeSyncPayload();
}

export async function runScheduledBroadcastNow(broadcastId: string) {
  const runtime = await refreshRuntime();
  const broadcast = runtime.state.scheduledBroadcasts.find((entry) => entry.id === broadcastId);
  if (!broadcast) {
    return { ok: false, delivered: 0 };
  }

  const delivered = runScheduledBroadcast(runtime, broadcast);
  await persistRuntime();
  return { ok: true, delivered };
}

export async function tickRuntimeAutomation() {
  const runtime = await refreshRuntime();
  return {
    ok: true,
    reports: runtime.state.reports.length,
    notes: runtime.state.notes.length,
    suggestions: runtime.state.suggestions.length,
    scheduledBroadcasts: runtime.state.scheduledBroadcasts.length,
  };
}
