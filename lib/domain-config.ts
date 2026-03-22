import type {
  CreditFile,
  Department,
  PostSaleFollowUp,
  Prospect,
  SalesOperation,
  SystemMode,
  TestDrive,
} from "@/lib/types";

type DomainLabels = {
  systemBadge: string;
  navLabels: Record<string, string>;
  heroTitle: string;
  heroDescription: string;
  primaryUnitLabel: string;
  leadSingular: string;
  leadPlural: string;
  testDriveSingular: string;
  testDrivePlural: string;
  operationSingular: string;
  operationPlural: string;
  creditSingular: string;
  creditPlural: string;
  followUpPlural: string;
  incidentPlural: string;
  locationPlural: string;
  interestLabel: string;
  financierLabel: string;
  subsidyLabel: string;
  postSaleLabel: string;
  pipelineTitle: string;
  pipelineDescription: string;
  postSaleTitle: string;
  postSaleDescription: string;
  incidentTitle: string;
  incidentDescription: string;
  multisiteTitle: string;
  multisiteDescription: string;
  dashboardTitle: string;
  dashboardDescription: string;
  reportContext: string;
  aiContext: string;
  loginPrompt: string;
  loginBullets: string[];
  quickPrompts: string[];
  prospectStatusLabels: Record<Prospect["status"], string>;
  testDriveStatusLabels: Record<TestDrive["status"], string>;
  salesStageLabels: Record<SalesOperation["stage"], string>;
  creditStatusLabels: Record<CreditFile["status"], string>;
  postSaleStatusLabels: Record<PostSaleFollowUp["status"], string>;
  departmentLabels: Record<Department, string>;
};

const automotiveConfig: DomainLabels = {
  systemBadge: "Capataz.ai | Concesionarias",
  navLabels: {
    dashboard: "Home",
    junta: "Junta",
    pipeline: "Pipeline",
    tasks: "Tareas",
    kanban: "Kanban",
    team: "Equipo",
    postventa: "Post-venta",
    campana: "Campana",
    multisucursal: "Agencias",
    score: "Score",
    fintech: "Fintech",
    reports: "Reportes",
    checklists: "Checklists",
    alerts: "Alertas",
    whatsapp: "WhatsApp",
    settings: "Configuracion",
  },
  heroTitle: "Operacion comercial, atencion critica y post-venta en una sola vista.",
  heroDescription:
    "Este demo aterriza la vertical automotriz: juntas diarias, pipeline comercial, incidentes de campana, seguimiento post-venta y visibilidad por agencia.",
  primaryUnitLabel: "agencia",
  leadSingular: "prospecto",
  leadPlural: "prospectos",
  testDriveSingular: "prueba de manejo",
  testDrivePlural: "pruebas de manejo",
  operationSingular: "operacion",
  operationPlural: "operaciones",
  creditSingular: "expediente",
  creditPlural: "expedientes",
  followUpPlural: "seguimientos post-venta",
  incidentPlural: "campanas",
  locationPlural: "agencias",
  interestLabel: "Interes",
  financierLabel: "Financiera",
  subsidyLabel: "Subvencion",
  postSaleLabel: "Post-venta",
  pipelineTitle: "Prospecto, prueba, negociacion y cierre",
  pipelineDescription: "Embudo editable con operaciones y expediente de credito sincronizados con el runtime del Capataz.",
  postSaleTitle: "Retencion y seguimiento de clientes",
  postSaleDescription: "Clientes vendidos, contactos pendientes y riesgos de fuga a otra agencia.",
  incidentTitle: "Atencion critica de clientes",
  incidentDescription: "Incidentes abiertos, responsables y tiempos de respuesta para evitar escalaciones ciegas.",
  multisiteTitle: "Comparativo por agencia",
  multisiteDescription: "Lectura corporativa para Director o Gerente de Marca: conversion, credito, campana y post-venta en el mismo corte.",
  dashboardTitle: "La agencia en un solo golpe de vista.",
  dashboardDescription: "Pipeline comercial, atencion critica, post-venta y ritmo semanal para decidir sin perseguir reportes manuales.",
  reportContext: "negocio automotriz",
  aiContext: "concesionarias, ventas, servicio, post-venta, expedientes y cierre comercial",
  loginPrompt: "Demo automotriz para grupos y agencias",
  loginBullets: ["Junta diaria, conversion y cierre", "Capataz Score 35/25/25/15", "Demo automotriz para grupos y agencias"],
  quickPrompts: ["ayuda", "mis tareas", "reporte general", "mis prospectos", "mis seguimientos", "campana"],
  prospectStatusLabels: {
    new: "Nuevo",
    follow_up: "Seguimiento",
    test_drive: "Prueba",
    negotiation: "Negociacion",
    closed_won: "Ganado",
    closed_lost: "Perdido",
  },
  testDriveStatusLabels: {
    scheduled: "Agendada",
    completed: "Completada",
    no_show: "No show",
  },
  salesStageLabels: {
    prospecting: "Prospeccion",
    test_drive: "Prueba",
    negotiation: "Negociacion",
    credit_review: "Credito",
    ready_to_close: "Lista para cierre",
    closed_won: "Ganada",
    closed_lost: "Perdida",
  },
  creditStatusLabels: {
    collecting: "Recolectando",
    missing_documents: "Faltan docs",
    submitted: "Enviado",
    approved: "Aprobado",
    rejected: "Rechazado",
    cash_sale: "Contado",
  },
  postSaleStatusLabels: {
    pending: "Pendiente",
    contacted: "Contactado",
    at_risk: "En riesgo",
    closed: "Cerrado",
  },
  departmentLabels: {
    corporate: "Corporativo",
    general_management: "Gerencia general",
    sales: "Ventas",
    service: "Servicio",
    parts: "Refacciones",
    admin: "Administracion",
  },
};

const hospitalConfig: DomainLabels = {
  systemBadge: "Capataz.ai | Hospitales",
  navLabels: {
    dashboard: "Central",
    junta: "Huddle",
    pipeline: "Admisiones",
    tasks: "Pendientes",
    kanban: "Tablero",
    team: "Turnos",
    postventa: "Altas",
    campana: "Pacientes",
    multisucursal: "Hospitales",
    score: "Pulso",
    fintech: "Capital",
    reports: "Cortes",
    checklists: "Protocolos",
    alerts: "Riesgos",
    whatsapp: "Mensajes",
    settings: "Control",
  },
  heroTitle: "Operacion clinica, admisiones, altas e incidentes en una sola vista.",
  heroDescription:
    "Este demo aterriza la vertical hospitalaria: junta de ocupacion, flujo de ingresos, autorizaciones, seguimiento de alta e incidentes de experiencia del paciente.",
  primaryUnitLabel: "hospital",
  leadSingular: "ingreso",
  leadPlural: "ingresos",
  testDriveSingular: "valoracion",
  testDrivePlural: "valoraciones",
  operationSingular: "atencion",
  operationPlural: "atenciones",
  creditSingular: "autorizacion",
  creditPlural: "autorizaciones",
  followUpPlural: "seguimientos de alta",
  incidentPlural: "incidentes clinicos",
  locationPlural: "hospitales",
  interestLabel: "Servicio requerido",
  financierLabel: "Aseguradora",
  subsidyLabel: "Cobertura",
  postSaleLabel: "Seguimiento alta",
  pipelineTitle: "Ingreso, valoracion, coordinacion y atencion",
  pipelineDescription: "Embudo editable de admisiones, estudios, autorizaciones y atencion sincronizado con el runtime del Capataz.",
  postSaleTitle: "Continuidad y seguimiento de alta",
  postSaleDescription: "Pacientes egresados, contactos pendientes y riesgos de reingreso o mala experiencia.",
  incidentTitle: "Atencion critica de paciente y familiar",
  incidentDescription: "Incidentes abiertos, responsables y tiempos de respuesta para evitar escalaciones ciegas.",
  multisiteTitle: "Comparativo por hospital",
  multisiteDescription: "Lectura corporativa para direccion: ocupacion, autorizaciones, incidentes y continuidad de cuidado en el mismo corte.",
  dashboardTitle: "El hospital en un solo golpe de vista.",
  dashboardDescription: "Admisiones, incidentes, continuidad de alta y ritmo semanal para decidir sin perseguir reportes manuales.",
  reportContext: "negocio hospitalario",
  aiContext: "hospitales, admisiones, aseguradoras, quirofano, camas, incidentes clinicos y continuidad de alta",
  loginPrompt: "Demo hospitalario para red privada y multisede",
  loginBullets: ["Huddle clinico, ocupacion y camas", "Autorizaciones y continuidad de alta", "Demo hospitalario para red privada y multisede"],
  quickPrompts: ["ayuda", "mis tareas", "reporte general", "mis ingresos", "mis seguimientos", "incidentes"],
  prospectStatusLabels: {
    new: "Nuevo ingreso",
    follow_up: "Admisiones",
    test_drive: "Valoracion",
    negotiation: "Coordinacion",
    closed_won: "Atendido",
    closed_lost: "Cancelado",
  },
  testDriveStatusLabels: {
    scheduled: "Agendada",
    completed: "Completada",
    no_show: "Ausente",
  },
  salesStageLabels: {
    prospecting: "Ingreso",
    test_drive: "Valoracion",
    negotiation: "Coordinacion",
    credit_review: "Autorizacion",
    ready_to_close: "Lista para ingreso",
    closed_won: "Atendido",
    closed_lost: "Cancelado",
  },
  creditStatusLabels: {
    collecting: "Integrando",
    missing_documents: "Faltan docs",
    submitted: "En revision",
    approved: "Autorizado",
    rejected: "Rechazado",
    cash_sale: "Particular",
  },
  postSaleStatusLabels: {
    pending: "Pendiente",
    contacted: "Contactado",
    at_risk: "En riesgo",
    closed: "Cerrado",
  },
  departmentLabels: {
    corporate: "Corporativo",
    general_management: "Direccion general",
    sales: "Admisiones",
    service: "Operacion clinica",
    parts: "Abasto",
    admin: "Administracion",
  },
};

const configs: Record<SystemMode, DomainLabels> = {
  automotive: automotiveConfig,
  hospital: hospitalConfig,
};

export function getDomainConfig(systemMode: SystemMode) {
  return configs[systemMode];
}

export function getDepartmentLabel(systemMode: SystemMode, department: Department) {
  return configs[systemMode].departmentLabels[department];
}
