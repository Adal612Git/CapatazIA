import { promises as fs } from "node:fs";
import path from "node:path";
import { getAppConfig } from "@/lib/runtime-config";

const SUPABASE_RUNTIME_TABLE = "capataz_runtime_snapshots";
const SUPABASE_RUNTIME_ROW_ID = "default";

async function readFromFile<T>(filePath: string) {
  const payload = await fs.readFile(filePath, "utf8");
  return JSON.parse(payload) as T;
}

async function writeToFile(filePath: string, payload: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function getSupabaseHeaders() {
  const config = getAppConfig();
  return {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function readFromSupabase<T>() {
  const config = getAppConfig();
  const endpoint = new URL(`/rest/v1/${SUPABASE_RUNTIME_TABLE}`, config.supabaseUrl);
  endpoint.searchParams.set("id", `eq.${SUPABASE_RUNTIME_ROW_ID}`);
  endpoint.searchParams.set("select", "payload");

  const response = await fetch(endpoint, {
    method: "GET",
    headers: getSupabaseHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase runtime read failed with status ${response.status}`);
  }

  const rows = (await response.json()) as Array<{ payload: T }>;
  return rows[0]?.payload ?? null;
}

async function writeToSupabase(payload: unknown) {
  const config = getAppConfig();
  const endpoint = new URL(`/rest/v1/${SUPABASE_RUNTIME_TABLE}`, config.supabaseUrl);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: SUPABASE_RUNTIME_ROW_ID,
      payload,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase runtime write failed with status ${response.status}`);
  }
}

export async function loadRuntimeSnapshot<T>() {
  const config = getAppConfig();

  if (config.runtimeBackend === "supabase") {
    try {
      const payload = await readFromSupabase<T>();
      if (payload) {
        return payload;
      }
    } catch {
      // Fallback to file/local seed if Supabase is not initialized yet.
    }
  }

  try {
    return await readFromFile<T>(config.runtimeFile);
  } catch {
    return null;
  }
}

export async function persistRuntimeSnapshot(payload: unknown) {
  const config = getAppConfig();

  if (config.runtimeBackend === "supabase") {
    try {
      await writeToSupabase(payload);
      return;
    } catch {
      // Fall through to file persistence for local/dev resilience.
    }
  }

  await writeToFile(config.runtimeFile, payload);
}
