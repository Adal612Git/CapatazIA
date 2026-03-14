import path from "node:path";

export function getAppConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Capataz AI",
    appEnv: process.env.APP_ENV?.trim() || process.env.NODE_ENV || "development",
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000",
    runtimeFile:
      process.env.CAPATAZ_RUNTIME_FILE?.trim() || path.join(process.cwd(), "data", "capataz-runtime.json"),
    whatsappProvider: process.env.WHATSAPP_PROVIDER === "cloud" ? "cloud" : "mock",
    supabaseUrl,
    supabaseServiceRoleKey,
    runtimeBackend: supabaseUrl && supabaseServiceRoleKey ? "supabase" : "file",
  } as const;
}
