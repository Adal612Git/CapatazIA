import { z } from "zod";

export const roleSchema = z.enum(["admin", "owner", "supervisor", "operator"]);
export const prioritySchema = z.enum(["low", "medium", "high", "critical"]);
export const taskColumnSchema = z.enum(["pending", "in_progress", "blocked", "done"]);

export const taskInputSchema = z.object({
  title: z.string().min(3, "El titulo debe tener al menos 3 caracteres").max(120, "El titulo no puede exceder 120 caracteres"),
  description: z
    .string()
    .min(8, "La descripcion debe tener al menos 8 caracteres")
    .max(800, "La descripcion no puede exceder 800 caracteres"),
  priority: prioritySchema,
  assigneeId: z.string().min(1, "Debes seleccionar un responsable"),
  dueAt: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), "La fecha limite no es valida")
    .refine((value) => new Date(value).getTime() > Date.now(), "La fecha limite debe quedar en el futuro"),
  location: z
    .string()
    .min(2, "La ubicacion debe tener al menos 2 caracteres")
    .max(120, "La ubicacion no puede exceder 120 caracteres"),
  tags: z
    .array(z.string().min(1, "Las etiquetas no pueden ir vacias").max(24, "Cada etiqueta debe tener maximo 24 caracteres"))
    .max(5, "Puedes capturar hasta 5 etiquetas"),
  requiresChecklist: z.boolean(),
});

export const taskEditSchema = z.object({
  priority: prioritySchema,
  dueAt: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), "La fecha limite no es valida")
    .refine((value) => new Date(value).getTime() > Date.now(), "La fecha limite debe quedar en el futuro"),
});

export const systemModeSchema = z.enum(["automotive", "hospital"]);

export const traceableActorSchema = z.object({
  actorId: z.string().min(1, "actorId es requerido"),
});

export const taskMutationSchema = traceableActorSchema.extend({
  systemMode: systemModeSchema.default("automotive"),
  task: taskInputSchema,
});

export const reportRequestSchema = traceableActorSchema.extend({
  systemMode: systemModeSchema.default("automotive"),
  kind: z.enum(["general", "daily_closure", "blockers", "team_member"]).default("general"),
  targetUserId: z.string().optional(),
  persist: z.boolean().default(true),
});

export const capatazContracts = {
  auth: {
    route: "/login",
    roles: roleSchema.options,
  },
  tasks: {
    route: "/api/v1/tasks",
    create: taskInputSchema,
    updateColumn: taskColumnSchema,
  },
  dashboard: {
    route: "/api/v1/dashboard/summary",
  },
  score: {
    route: "/api/v1/scores/summary",
    formula: "score = compliance*0.35 + speed*0.25 + consistency*0.25 + activity*0.15",
    window: "28 dias moviles",
  },
  reports: {
    route: "/api/v1/reports/generate",
  },
} as const;
