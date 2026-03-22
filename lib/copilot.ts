import { getDomainConfig } from "@/lib/domain-config";
import { canAccessRoute } from "@/lib/permissions";
import type { SystemMode, User } from "@/lib/types";

export interface CopilotModuleGuide {
  key: string;
  href: string;
  title: string;
  summary: string;
  actions: string[];
  keywords: string[];
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getCopilotModuleGuides(systemMode: SystemMode): CopilotModuleGuide[] {
  const domain = getDomainConfig(systemMode);

  return [
    {
      key: "dashboard",
      href: "/dashboard",
      title: domain.navLabels.dashboard,
      summary: "Vista general del negocio para arrancar el dia, detectar foco rojo y saltar al modulo correcto.",
      actions: ["ver prioridades del dia", "ubicar alertas", "entender el pulso operativo"],
      keywords: ["dashboard", "home", "inicio", "resumen", "overview", "panel principal", "prioridades"],
    },
    {
      key: "junta",
      href: "/junta",
      title: domain.navLabels.junta,
      summary: "Rutina de alineacion diaria para revisar ritmo, bloqueos y compromisos del turno o de la agencia.",
      actions: ["hacer junta diaria", "alinear pendientes", "revisar bloqueos del dia"],
      keywords: ["junta", "huddle", "reunion", "reunion diaria", "alineacion", "arranque"],
    },
    {
      key: "pipeline",
      href: "/pipeline",
      title: domain.navLabels.pipeline,
      summary: `Modulo para revisar ${domain.leadPlural}, ${domain.operationPlural}, conversion y ${domain.creditPlural}.`,
      actions: [
        `ver ${domain.leadPlural}`,
        `mover ${domain.operationPlural}`,
        `revisar ${domain.creditPlural}`,
      ],
      keywords: [
        "pipeline",
        "prospectos",
        "ingresos",
        "clientes",
        "leads",
        "embudo",
        "conversion",
        "cierres",
        "operaciones",
        "expedientes",
        "autorizaciones",
      ],
    },
    {
      key: "tasks",
      href: "/tasks",
      title: domain.navLabels.tasks,
      summary: "Listado de tareas y pendientes con foco en responsable, fecha y prioridad.",
      actions: ["ver pendientes", "filtrar tareas", "entrar al detalle de una tarea"],
      keywords: ["tareas", "pendientes", "to do", "task list", "lista de tareas"],
    },
    {
      key: "kanban",
      href: "/kanban",
      title: domain.navLabels.kanban,
      summary: "Tablero visual para mover trabajo entre columnas y detectar atorones rapido.",
      actions: ["mover tareas", "ver tareas bloqueadas", "repartir carga"],
      keywords: ["kanban", "tablero", "columnas", "arrastrar", "flujo de trabajo"],
    },
    {
      key: "team",
      href: "/team",
      title: domain.navLabels.team,
      summary: "Lectura del equipo por persona, rol, carga y desempeno visible.",
      actions: ["ver equipo", "revisar carga por persona", "entender jerarquia"],
      keywords: ["equipo", "team", "usuarios", "personas", "roles", "colaboradores"],
    },
    {
      key: "postventa",
      href: "/postventa",
      title: domain.navLabels.postventa,
      summary: `Seguimiento de ${domain.followUpPlural}, riesgos de fuga o continuidad y proximo contacto.`,
      actions: ["ver seguimientos", "marcar riesgo", "cerrar seguimiento"],
      keywords: ["postventa", "seguimientos", "altas", "retencion", "continuidad", "fuga", "seguimiento"],
    },
    {
      key: "campana",
      href: "/campana",
      title: domain.navLabels.campana,
      summary: `Modulo para gestionar ${domain.incidentPlural} o atencion critica de cliente/paciente.`,
      actions: ["ver incidentes", "tomar campana", "cerrar incidente"],
      keywords: ["campana", "incidentes", "pacientes", "cliente molesto", "atencion critica", "escalacion"],
    },
    {
      key: "multisucursal",
      href: "/multisucursal",
      title: domain.navLabels.multisucursal,
      summary: `Comparativo entre ${domain.locationPlural} para lectura corporativa y multisede.`,
      actions: ["comparar sedes", "ver performance por sitio", "revisar diferencias entre sedes"],
      keywords: ["multisucursal", "multisede", "agencias", "hospitales", "comparativo", "sucursales", "sedes"],
    },
    {
      key: "score",
      href: "/score",
      title: domain.navLabels.score,
      summary: "Lectura de score, tendencia y explicacion del desempeno por persona.",
      actions: ["ver score", "revisar tendencia", "explicar desempeno"],
      keywords: ["score", "pulso", "desempeno", "performance", "tendencia", "calificacion"],
    },
    {
      key: "fintech",
      href: "/fintech",
      title: domain.navLabels.fintech,
      summary: "Saldo, movimientos, solicitudes y oferta financiera ligada al score operativo.",
      actions: ["ver saldo", "revisar movimientos", "solicitar adelanto o credito"],
      keywords: ["fintech", "saldo", "movimientos", "credito", "adelanto", "dinero", "capital", "finanzas"],
    },
    {
      key: "reports",
      href: "/reports",
      title: domain.navLabels.reports,
      summary: "Cortes ejecutivos, narrativa operativa y reportes listos para revision gerencial.",
      actions: ["ver reportes", "leer corte general", "exportar narrativa ejecutiva"],
      keywords: ["reportes", "reporte", "corte", "resumen ejecutivo", "exportar", "insights"],
    },
    {
      key: "checklists",
      href: "/checklists",
      title: domain.navLabels.checklists,
      summary: "Protocolos y listas operativas para asegurar que el trabajo se cierre con evidencia.",
      actions: ["abrir checklist", "marcar items", "validar cierre"],
      keywords: ["checklist", "protocolos", "pasos", "items", "lista de control", "evidencia"],
    },
    {
      key: "alerts",
      href: "/alerts",
      title: domain.navLabels.alerts,
      summary: "Concentrado de alertas y riesgos que requieren seguimiento rapido.",
      actions: ["ver alertas", "priorizar riesgo", "limpiar pendientes criticos"],
      keywords: ["alertas", "riesgos", "urgente", "focos rojos", "warnings", "alarmas"],
    },
    {
      key: "whatsapp",
      href: "/whatsapp",
      title: domain.navLabels.whatsapp,
      summary: "Laboratorio del canal conversacional para operar con comandos y probar automatizaciones.",
      actions: ["probar comandos", "simular conversacion", "operar por chat"],
      keywords: ["whatsapp", "chat", "conversacion", "bot", "comandos", "mensajes"],
    },
    {
      key: "settings",
      href: "/settings",
      title: domain.navLabels.settings,
      summary: "Configuracion del sistema, broadcasts y control operativo general.",
      actions: ["ajustar broadcasts", "configurar mensajes", "revisar control del sistema"],
      keywords: ["settings", "configuracion", "broadcasts", "control", "ajustes"],
    },
  ];
}

export function getAccessibleCopilotModuleGuides(systemMode: SystemMode, user: User) {
  return getCopilotModuleGuides(systemMode).filter((guide) => canAccessRoute(user, guide.key));
}

export function getCopilotGuideForPath(systemMode: SystemMode, currentPath: string | null | undefined, user?: User | null) {
  if (!currentPath) {
    return null;
  }

  const path = currentPath.split("?")[0];
  const guides = user ? getAccessibleCopilotModuleGuides(systemMode, user) : getCopilotModuleGuides(systemMode);

  return guides.find((guide) => path === guide.href || path.startsWith(`${guide.href}/`)) ?? null;
}

export function findCopilotGuidesForQuery(systemMode: SystemMode, message: string, user?: User | null) {
  const normalizedMessage = normalize(message);
  if (!normalizedMessage) {
    return [];
  }

  const guides = user ? getAccessibleCopilotModuleGuides(systemMode, user) : getCopilotModuleGuides(systemMode);

  return guides
    .map((guide) => {
      let score = 0;
      const fields = [guide.key, guide.href, guide.title, guide.summary, ...guide.actions, ...guide.keywords];
      fields.forEach((field) => {
        const normalizedField = normalize(field);
        if (!normalizedField) {
          return;
        }
        if (normalizedMessage.includes(normalizedField)) {
          score += normalizedField.length > 10 ? 4 : 2;
        } else if (normalizedField.split(" ").some((token) => token.length > 3 && normalizedMessage.includes(token))) {
          score += 1;
        }
      });
      return { guide, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.guide)
    .slice(0, 4);
}
