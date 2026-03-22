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

export interface Overview {
  product: string;
  phase: string;
  promise: string;
  primaryChannel: string;
  architecture: string[];
  metrics: Metric[];
  topRisks: string[];
  organization: {
    id: string;
    name: string;
    segment: string;
    region: string;
    regulatoryStatus: string;
  };
  currentUser: {
    id: string;
    fullName: string;
    title: string;
    role: string;
    riskProfile: string;
  };
  roadmap: RoadmapItem[];
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

export interface WalletBalances {
  totalMxn: number;
  totalUsd: number;
  asOf: string;
  threshold: number;
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
  id: string;
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

export interface RiskProfile {
  label: string;
  horizon: string;
  restrictions: string[];
}

export interface Approval {
  id: string;
  title: string;
  amount: number;
  policy: string;
  status: 'pending' | 'approved' | 'escalated';
  requester: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  owner: string;
  lane: string;
  status: 'in_progress' | 'blocked' | 'done';
  dueAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  channel: string;
  dueAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  state: string;
  owner: string;
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

export interface SharkContext {
  preferredChannel: string;
  activePersona: string;
  memory: string[];
}

export interface SharkResponse {
  detectedIntent: string;
  reply: string;
  requiresApproval: boolean;
  suggestedActions: string[];
}

export interface BootstrapData {
  overview: Overview;
  walletAccounts: WalletAccount[];
  walletBalances: WalletBalances;
  walletMovements: WalletMovement[];
  beneficiaries: Beneficiary[];
  portfolioSummary: PortfolioSummary;
  portfolioPositions: PortfolioPosition[];
  riskProfile: RiskProfile;
  approvals: Approval[];
  tasks: Task[];
  reminders: Reminder[];
  workflows: Workflow[];
  auditEvents: AuditEvent[];
  commands: string[];
  sharkContext: SharkContext;
}
