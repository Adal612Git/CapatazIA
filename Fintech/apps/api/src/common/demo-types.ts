export type ApprovalStatus = 'pending' | 'approved' | 'escalated';
export type TaskStatus = 'in_progress' | 'blocked' | 'done';

export interface Metric {
  label: string;
  value: string;
  hint: string;
  tone?: 'cyan' | 'gold' | 'mint' | 'rose';
}

export interface RoadmapItem {
  id: string;
  horizon: string;
  objective: string;
  deliverable: string;
  exitCriteria: string;
  dependencies: string[];
  status: 'active' | 'planned';
}

export interface Organization {
  id: string;
  name: string;
  segment: string;
  region: string;
  regulatoryStatus: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  title: string;
  role: string;
  organizationId: string;
  riskProfile: string;
}

export interface WalletAccount {
  id: string;
  name: string;
  kind: string;
  currency: string;
  available: number;
  pending: number;
  alias: string;
}

export interface WalletMovement {
  id: string;
  accountId: string;
  type: string;
  counterparty: string;
  amount: number;
  status: string;
  createdAt: string;
  reference: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  bank: string;
  accountMask: string;
  type: string;
}

export interface PortfolioSummary {
  totalValue: number;
  monthlyPerformancePct: number;
  cashPct: number;
  riskBand: string;
  benchmark: string;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  weightPct: number;
  marketValue: number;
  pnlPct: number;
  thesis: string;
}

export interface ApprovalItem {
  id: string;
  title: string;
  amount: number;
  policy: string;
  status: ApprovalStatus;
  requester: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  owner: string;
  lane: string;
  status: TaskStatus;
  dueAt: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  channel: string;
  dueAt: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  resourceType: string;
  actor: string;
  channel: string;
  createdAt: string;
  summary: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  state: string;
  owner: string;
}

export interface SharkCommandResponse {
  detectedIntent: string;
  reply: string;
  requiresApproval: boolean;
  suggestedActions: string[];
}
