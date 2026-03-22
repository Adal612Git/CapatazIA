import type {
  BellIncident,
  ChecklistInstance,
  CreditFile,
  Department,
  PostSaleFollowUp,
  Prospect,
  Role,
  SalesOperation,
  Task,
  TestDrive,
  User,
} from "@/lib/types";

export const navigationByRole = {
  admin: ["dashboard", "junta", "pipeline", "tasks", "kanban", "team", "postventa", "campana", "multisucursal", "score", "fintech", "reports", "checklists", "alerts", "whatsapp", "settings"],
  owner: ["dashboard", "junta", "pipeline", "tasks", "kanban", "team", "postventa", "campana", "score", "fintech", "reports", "checklists", "alerts", "whatsapp", "settings"],
  supervisor: ["dashboard", "junta", "pipeline", "tasks", "kanban", "team", "postventa", "campana", "score", "fintech", "reports", "checklists", "alerts", "whatsapp"],
  operator: ["dashboard", "pipeline", "tasks", "kanban", "postventa", "campana", "score", "fintech", "reports", "checklists", "alerts", "whatsapp"],
} satisfies Record<Role, string[]>;

const salesRoutes = new Set(["junta", "pipeline", "postventa"]);
const multisiteRoutes = new Set(["multisucursal"]);

export function isCorporateUser(user: User) {
  return user.role === "admin" || user.department === "corporate";
}

export function isManagementUser(user: User) {
  return user.role === "admin" || user.role === "owner" || user.role === "supervisor";
}

export function isSalesUser(user: User) {
  return user.department === "sales" || user.department === "general_management" || user.department === "corporate";
}

export function sameAgency(user: User, agency: string) {
  if (isCorporateUser(user)) {
    return true;
  }

  return user.site === agency;
}

export function sameSiteId(user: User, siteId: string) {
  if (isCorporateUser(user)) {
    return true;
  }

  return user.siteId === siteId;
}

export function canAccess(role: Role, route: string) {
  return navigationByRole[role].includes(route);
}

export function canAccessRoute(user: User, route: string) {
  if (!navigationByRole[user.role].includes(route)) {
    return false;
  }
  if (multisiteRoutes.has(route)) {
    return isCorporateUser(user);
  }
  if (salesRoutes.has(route)) {
    return isSalesUser(user);
  }
  return true;
}

export function canCreateTasks(role: Role) {
  return role === "admin" || role === "supervisor";
}

export function departmentLabel(department: Department) {
  switch (department) {
    case "corporate":
      return "Corporativo";
    case "general_management":
      return "Gerencia general";
    case "sales":
      return "Ventas";
    case "service":
      return "Servicio";
    case "parts":
      return "Refacciones";
    case "admin":
      return "Administracion";
    default:
      return department;
  }
}

export function incidentAreaDepartment(area: BellIncident["area"]): Department {
  switch (area) {
    case "sales":
      return "sales";
    case "service":
      return "service";
    case "parts":
      return "parts";
    default:
      return "admin";
  }
}

export function canViewTask(user: User, task: Task, users?: User[]) {
  if (isCorporateUser(user)) {
    return true;
  }
  const assignee = users?.find((entry) => entry.id === task.assigneeId);
  if (!assignee) {
    return user.role !== "operator";
  }
  if (!sameAgency(user, assignee.site)) {
    return false;
  }
  if (user.role === "owner") {
    return true;
  }
  if (user.role === "supervisor") {
    return assignee.department === user.department || assignee.role === "owner";
  }
  return task.assigneeId === user.id;
}

export function canMoveTask(user: User, task: Task, users?: User[]) {
  if (user.role === "admin") {
    return true;
  }
  const assignee = users?.find((entry) => entry.id === task.assigneeId);
  if (user.role === "owner") {
    return assignee ? sameAgency(user, assignee.site) : true;
  }
  if (user.role === "supervisor") {
    return assignee ? sameAgency(user, assignee.site) && assignee.department === user.department : true;
  }
  return task.assigneeId === user.id;
}

export function canEditTask(user: User, task: Task, users?: User[]) {
  if (user.role === "admin") {
    return true;
  }
  const assignee = users?.find((entry) => entry.id === task.assigneeId);
  if (user.role === "owner") {
    return assignee ? sameAgency(user, assignee.site) : true;
  }
  if (user.role === "supervisor") {
    return assignee ? sameAgency(user, assignee.site) && assignee.department === user.department : true;
  }
  return false;
}

export function canToggleChecklist(user: User, checklist: ChecklistInstance) {
  if (user.role === "admin" || user.role === "supervisor" || user.role === "owner") {
    return true;
  }
  return checklist.assigneeId === user.id;
}

export function canViewCommercialEntity(user: User, agency: string) {
  return isSalesUser(user) && sameAgency(user, agency);
}

export function canManageCommercialEntity(user: User, agency: string, salespersonId?: string) {
  if (!canViewCommercialEntity(user, agency)) {
    return false;
  }
  if (user.role === "admin" || user.role === "owner" || user.role === "supervisor") {
    return true;
  }
  return salespersonId === user.id;
}

export function canViewCommercialEntityByScope(user: User, scope: { groupId: string; brandId: string; siteId: string }) {
  if (!isSalesUser(user)) {
    return false;
  }
  if (isCorporateUser(user)) {
    return user.groupId === scope.groupId && user.brandId === scope.brandId;
  }
  return user.brandId === scope.brandId && sameSiteId(user, scope.siteId);
}

export function canManageCommercialEntityByScope(
  user: User,
  scope: { groupId: string; brandId: string; siteId: string },
  salespersonId?: string,
) {
  if (!canViewCommercialEntityByScope(user, scope)) {
    return false;
  }
  if (user.role === "admin" || user.role === "owner" || user.role === "supervisor") {
    return true;
  }
  return salespersonId === user.id;
}

export function canViewProspect(user: User, prospect: Prospect) {
  return canViewCommercialEntityByScope(user, prospect);
}

export function canManageProspect(user: User, prospect: Prospect) {
  return canManageCommercialEntityByScope(user, prospect, prospect.salespersonId);
}

export function canViewTestDrive(user: User, testDrive: TestDrive) {
  return canViewCommercialEntityByScope(user, testDrive);
}

export function canManageTestDrive(user: User, testDrive: TestDrive) {
  return canManageCommercialEntityByScope(user, testDrive, testDrive.salespersonId);
}

export function canViewSalesOperation(user: User, operation: SalesOperation) {
  return canViewCommercialEntityByScope(user, operation);
}

export function canManageSalesOperation(user: User, operation: SalesOperation) {
  return canManageCommercialEntityByScope(user, operation, operation.salespersonId);
}

export function canViewCreditFile(user: User, creditFile: CreditFile) {
  return canViewCommercialEntityByScope(user, creditFile);
}

export function canManageCreditFile(user: User, creditFile: CreditFile) {
  return canManageCommercialEntityByScope(user, creditFile, creditFile.salespersonId);
}

export function canViewPostSaleFollowUp(user: User, followUp: PostSaleFollowUp) {
  return canViewCommercialEntityByScope(user, followUp);
}

export function canManagePostSaleFollowUp(user: User, followUp: PostSaleFollowUp) {
  return canManageCommercialEntityByScope(user, followUp, followUp.salespersonId);
}

export function canViewBellIncident(user: User, incident: BellIncident) {
  if (!sameSiteId(user, incident.siteId)) {
    return false;
  }
  if (user.role === "admin" || user.role === "owner") {
    return true;
  }
  if (user.role === "supervisor") {
    return true;
  }
  return user.id === incident.ownerId || user.department === incidentAreaDepartment(incident.area);
}

export function canManageBellIncident(user: User, incident: BellIncident) {
  if (!sameSiteId(user, incident.siteId)) {
    return false;
  }
  if (user.role === "admin" || user.role === "owner" || user.role === "supervisor") {
    return true;
  }
  return user.id === incident.ownerId;
}

export function canViewUserProfile(viewer: User, subject: User) {
  if (isCorporateUser(viewer)) {
    return true;
  }
  if (!sameAgency(viewer, subject.site)) {
    return false;
  }
  if (viewer.role === "owner") {
    return true;
  }
  if (viewer.role === "supervisor") {
    return subject.department === viewer.department || subject.id === viewer.id;
  }
  return viewer.id === subject.id;
}
