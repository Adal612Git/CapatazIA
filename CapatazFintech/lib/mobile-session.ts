import Constants from 'expo-constants';
import { useEffect, useState, useSyncExternalStore } from 'react';

export type MobileSystemMode = 'automotive' | 'hospital';
const DEFAULT_REMOTE_API_BASE_URL = 'https://capataz-ia-nine.vercel.app';
const FALLBACK_REMOTE_API_BASE_URLS = [
  'https://capataz-6ba81pwiw-adal666s-projects.vercel.app',
  'https://capataz-ia-nine.vercel.app',
];

export interface MobileAuthSession {
  id: string;
  name: string;
  email: string;
  role: string;
  systemMode: MobileSystemMode;
}

export interface MobileBundle {
  currentUser: {
    id: string;
    name: string;
    role: string;
    sede: string;
    avatar: string;
    score: number;
    email: string;
    statusLabel: string;
  };
  scoreBreakdown: {
    cumplimiento: number;
    velocidad: number;
    consistencia: number;
    actividad: number;
  };
  scoreHistory: Array<{ week: string; score: number }>;
  teamScores: Array<{ name: string; role: string; score: number; avatar: string; trend: string; isMe?: boolean }>;
  myTasks: Array<{
    id: string;
    title: string;
    priority: 'alta' | 'media' | 'baja';
    status: 'pendiente' | 'en_proceso' | 'completado';
    dueTime: string;
    hasChecklist: boolean;
    overdue: boolean;
  }>;
  weeklyActivity: Array<{ day: string; completed: number; total: number }>;
  creditProducts: Array<{
    id: string;
    name: string;
    description: string;
    maxAmount: number;
    rate: string;
    term: string;
    icon: string;
    available: boolean;
    requiredScore: number;
    color: string;
  }>;
  transactions: Array<{
    id: string;
    type: 'credito' | 'pago' | 'bono';
    title: string;
    amount: number;
    date: string;
    status: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    time: string;
    read: boolean;
  }>;
  applications: Array<{
    id: string;
    productName: string;
    requestedAmount: number;
    status: string;
    termLabel: string;
  }>;
  financeInsights: Array<{
    id: string;
    title: string;
    body: string;
    tone: string;
  }>;
  accountSummary: {
    availableBalance: number;
    pendingBalance: number;
    creditLimit: number;
    activeApplications: number;
  };
  achievements: Array<{
    id: number;
    title: string;
    desc: string;
    icon: string;
    color: string;
    earned: boolean;
  }>;
}

let currentSession: MobileAuthSession | null = null;
let lastReachableApiBaseUrl = DEFAULT_REMOTE_API_BASE_URL;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentSession;
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function resolveApiBaseUrl() {
  const envBaseUrl = process.env.EXPO_PUBLIC_CAPATAZ_API_BASE_URL?.trim();
  if (envBaseUrl) {
    return normalizeBaseUrl(envBaseUrl);
  }

  const extraBaseUrl =
    (Constants as any)?.expoConfig?.extra?.capatazApiBaseUrl ??
    (Constants as any)?.manifest2?.extra?.expoClient?.extra?.capatazApiBaseUrl;

  if (typeof extraBaseUrl === 'string' && extraBaseUrl.trim()) {
    return normalizeBaseUrl(extraBaseUrl);
  }

  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ??
    (Constants as any)?.expoGoConfig?.debuggerHost ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }

  return DEFAULT_REMOTE_API_BASE_URL;
}

function uniqueBaseUrls(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    if (!value) {
      return;
    }
    const normalized = normalizeBaseUrl(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    next.push(normalized);
  });

  return next;
}

function getCandidateApiBaseUrls() {
  const preferred = resolveApiBaseUrl();
  return uniqueBaseUrls([preferred, lastReachableApiBaseUrl, ...FALLBACK_REMOTE_API_BASE_URLS]);
}

export function getApiConnectionHint() {
  return lastReachableApiBaseUrl || resolveApiBaseUrl();
}

async function fetchWithApiFallback(path: string, init?: RequestInit) {
  const candidates = getCandidateApiBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      if (response.status === 404 && candidates.length > 1) {
        lastError = new Error(`Ruta no encontrada en ${baseUrl}`);
        continue;
      }
      lastReachableApiBaseUrl = baseUrl;
      return { response, baseUrl };
    } catch {
      lastError = new Error(`No se pudo conectar con ${baseUrl}`);
    }
  }

  throw lastError ?? new Error('No se pudo conectar con ningun backend disponible.');
}

export function useMobileSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setMobileSession(session: MobileAuthSession | null) {
  currentSession = session;
  emitChange();
}

export async function loginAgainstApi(email: string, password: string, systemMode: MobileSystemMode = 'automotive') {
  const { response, baseUrl } = await fetchWithApiFallback('/api/mobile/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, systemMode }),
  }).catch(() => {
    throw new Error(`No se pudo conectar con ${getCandidateApiBaseUrls().join(' | ')}. Revisa EXPO_PUBLIC_CAPATAZ_API_BASE_URL o tu red.`);
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? `No se pudo iniciar sesion contra ${baseUrl}`);
  }

  setMobileSession(payload as MobileAuthSession);
  return payload as MobileAuthSession;
}

export async function fetchMobileBundle(session: MobileAuthSession) {
  const { response, baseUrl } = await fetchWithApiFallback(
    `/api/mobile/session?userId=${encodeURIComponent(session.id)}&systemMode=${encodeURIComponent(session.systemMode)}`,
  ).catch(() => {
    throw new Error(`No se pudo conectar con ${getCandidateApiBaseUrls().join(' | ')}.`);
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `No se pudo cargar la sesion movil desde ${baseUrl}`);
  }

  return payload as MobileBundle;
}

export async function applyForCredit(session: MobileAuthSession, productId: string, amount: number, rationale: string) {
  const { response, baseUrl } = await fetchWithApiFallback('/api/mobile/credit/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: session.id,
      productId,
      amount,
      rationale,
      systemMode: session.systemMode,
    }),
  }).catch(() => {
    throw new Error(`No se pudo conectar con ${getCandidateApiBaseUrls().join(' | ')}.`);
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? `No se pudo enviar la solicitud desde ${baseUrl}`);
  }

  return payload as { ok: true; message: string; status: string };
}

export function useMobileBundle() {
  const session = useMobileSession();
  const [bundle, setBundle] = useState<MobileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!session) {
        setBundle(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const nextBundle = await fetchMobileBundle(session);
        if (!cancelled) {
          setBundle(nextBundle);
          setLoading(false);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'No se pudo cargar la app');
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function reload() {
    if (!session) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const nextBundle = await fetchMobileBundle(session);
      setBundle(nextBundle);
      setLoading(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo refrescar');
      setLoading(false);
    }
  }

  return {
    session,
    bundle,
    loading,
    error,
    reload,
  };
}
