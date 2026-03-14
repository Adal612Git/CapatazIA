export type Role = "admin" | "owner" | "supervisor" | "operator";

export type Department = "corporate" | "general_management" | "sales" | "service" | "parts" | "admin";

export type Priority = "low" | "medium" | "high" | "critical";

export type Severity = "info" | "warning" | "critical";

export type Trend = "up" | "down" | "steady";

export type TaskColumnId = "pending" | "in_progress" | "blocked" | "done";

export type ProspectStatus = "new" | "follow_up" | "test_drive" | "negotiation" | "closed_won" | "closed_lost";

export type TestDriveStatus = "scheduled" | "completed" | "no_show";

export type SalesOperationStage =
  | "prospecting"
  | "test_drive"
  | "negotiation"
  | "credit_review"
  | "ready_to_close"
  | "closed_won"
  | "closed_lost";

export type CreditFileStatus = "collecting" | "missing_documents" | "submitted" | "approved" | "rejected" | "cash_sale";

export type SubsidyType = "none" | "down_payment" | "insurance" | "rate";

export type IncidentArea = "sales" | "service" | "parts" | "admin";

export type IncidentStatus = "open" | "in_progress" | "resolved";

export type PostSaleStatus = "pending" | "contacted" | "at_risk" | "closed";

export type BroadcastAudience = "all_staff" | "sales_only" | "service_only";

export type BroadcastFrequency = "daily" | "weekdays";

export interface OrgScope {
  groupId: string;
  brandId: string;
  siteId: string;
}

export interface Workspace {
  id: string;
  name: string;
  industry: string;
  timezone: string;
  tagline: string;
  scorePolicy: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
  department: Department;
  groupId: string;
  brandId: string;
  siteId: string;
  site: string;
  avatar: string;
  accent: string;
  statusLabel: string;
}

export interface Column {
  id: string;
  title: string;
  color: string;
  limit?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  columnId: string;
  assigneeId: string;
  reporterId: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  location: string;
  tags: string[];
  requiresChecklist: boolean;
  checklistInstanceId?: string;
  blockedReason?: string;
  completedAt?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  required: boolean;
  completedAt?: string;
}

export interface ChecklistInstance {
  id: string;
  taskId: string;
  templateName: string;
  assigneeId: string;
  status: "pending" | "in_progress" | "complete";
  items: ChecklistItem[];
}

export interface Alert {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  read: boolean;
  createdAt: string;
  relatedTaskId?: string;
}

export interface ActivityEntry {
  id: string;
  actorId: string;
  message: string;
  createdAt: string;
}

export interface Prospect extends OrgScope {
  id: string;
  customerName: string;
  salespersonId: string;
  agency: string;
  source: string;
  status: ProspectStatus;
  createdAt: string;
  nextActionAt?: string;
  vehicleInterest: string;
  financingRequired: boolean;
  notes: string;
}

export interface TestDrive extends OrgScope {
  id: string;
  prospectId: string;
  salespersonId: string;
  agency: string;
  vehicleModel: string;
  scheduledAt: string;
  status: TestDriveStatus;
  completedAt?: string;
}

export interface SalesOperation extends OrgScope {
  id: string;
  prospectId: string;
  customerName: string;
  agency: string;
  salespersonId: string;
  vehicleModel: string;
  stage: SalesOperationStage;
  source: string;
  financingRequired: boolean;
  financier: string;
  subsidyType: SubsidyType;
  subsidyAmount: number;
  tradeInRequired: boolean;
  closingProbability: number;
  expectedCloseAt: string;
  nextStep: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  lostReason?: string;
}

export interface CreditFile extends OrgScope {
  id: string;
  operationId: string;
  customerName: string;
  agency: string;
  salespersonId: string;
  financier: string;
  status: CreditFileStatus;
  downPaymentReady: boolean;
  requiredDocuments: string[];
  receivedDocuments: string[];
  missingDocuments: string[];
  submittedAt?: string;
  decisionAt?: string;
  notes: string;
}

export interface BellIncident extends OrgScope {
  id: string;
  customerName: string;
  agency: string;
  area: IncidentArea;
  severity: Severity;
  status: IncidentStatus;
  summary: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  resolutionNote?: string;
}

export interface PostSaleFollowUp extends OrgScope {
  id: string;
  customerName: string;
  vehicleModel: string;
  salespersonId: string;
  agency: string;
  saleDate: string;
  dueAt: string;
  status: PostSaleStatus;
  nextStep: string;
  lastContactAt?: string;
}

export interface GeneratedReport {
  id: string;
  kind: "general" | "daily_closure" | "blockers" | "team_member";
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

export interface ScheduledBroadcast {
  id: string;
  title: string;
  message: string;
  audioLabel?: string;
  audience: BroadcastAudience;
  frequency: BroadcastFrequency;
  timeOfDay: string;
  timezone: string;
  active: boolean;
  lastSentOn?: string;
}

export interface ScoreSnapshot {
  userId: string;
  compliance: number;
  speed: number;
  consistency: number;
  activity: number;
  score: number;
  trend: Trend;
  note: string;
}

export interface WeeklyPoint {
  day: string;
  completed: number;
  alerts: number;
  overdue: number;
}

export interface AppSeed {
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
  scoreSnapshots: ScoreSnapshot[];
  weekly: WeeklyPoint[];
}

export interface RuntimeSyncPayload {
  users: User[];
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
  reports: GeneratedReport[];
  notes: OperationalNote[];
  suggestions: OperationalSuggestion[];
}

export interface TaskInput {
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string;
  dueAt: string;
  location: string;
  tags: string[];
  requiresChecklist: boolean;
}
