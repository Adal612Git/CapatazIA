import type {
  Approval,
  AuditEvent,
  Beneficiary,
  BootstrapData,
  Overview,
  PortfolioPosition,
  PortfolioSummary,
  Reminder,
  RiskProfile,
  SharkContext,
  SharkResponse,
  Task,
  WalletAccount,
  WalletBalances,
  WalletMovement,
  Workflow,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? 'rick@tpc.demo';
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? 'DemoPass123!';
const TOKEN_STORAGE_KEY = 'tpc_demo_token';

let accessToken =
  typeof window !== 'undefined'
    ? window.localStorage.getItem(TOKEN_STORAGE_KEY)
    : null;

async function loginDemo() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error('Demo login failed');
  }

  const payload = (await response.json()) as { accessToken: string };
  accessToken = payload.accessToken;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.accessToken);
  }

  return payload.accessToken;
}

async function ensureToken() {
  if (accessToken) {
    return accessToken;
  }

  return loginDemo();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await ensureToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    ...init,
  });

  if (response.status === 401) {
    accessToken = null;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    await loginDemo();
    return request<T>(path, init);
  }

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function loadDashboard(): Promise<BootstrapData> {
  const [
    overview,
    walletAccounts,
    walletBalances,
    walletMovements,
    beneficiaries,
    portfolioSummary,
    portfolioPositions,
    riskProfile,
    approvals,
    tasks,
    reminders,
    workflows,
    auditEvents,
    commands,
    sharkContext,
  ] = await Promise.all([
    request<Overview>('/dashboard/overview'),
    request<WalletAccount[]>('/wallet/accounts'),
    request<WalletBalances>('/wallet/balances'),
    request<WalletMovement[]>('/wallet/movements'),
    request<Beneficiary[]>('/wallet/beneficiaries'),
    request<PortfolioSummary>('/portfolio/summary'),
    request<PortfolioPosition[]>('/portfolio/positions'),
    request<RiskProfile>('/risk-profile'),
    request<Approval[]>('/approvals'),
    request<Task[]>('/tasks'),
    request<Reminder[]>('/reminders'),
    request<Workflow[]>('/capataz/workflows'),
    request<AuditEvent[]>('/audit/events'),
    request<string[]>('/shark/commands'),
    request<SharkContext>('/shark/context'),
  ]);

  return {
    overview,
    walletAccounts,
    walletBalances,
    walletMovements,
    beneficiaries,
    portfolioSummary,
    portfolioPositions,
    riskProfile,
    approvals,
    tasks,
    reminders,
    workflows,
    auditEvents,
    commands,
    sharkContext,
  };
}

export function sendSharkCommand(message: string) {
  return request<SharkResponse>('/shark/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function createTransfer(payload: {
  fromWalletAccountId: string;
  beneficiaryId: string;
  amount: number;
  concept: string;
}) {
  return request<{ nextStep: string }>('/wallet/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createOrderIntent(payload: {
  portfolioId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  rationale: string;
}) {
  return request<{ narrative: string }>('/orders/intents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
