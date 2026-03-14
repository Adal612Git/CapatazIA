import { NextResponse } from "next/server";
import { geminiEnabled } from "@/lib/ai/gemini";
import { getAppConfig } from "@/lib/runtime-config";

export async function GET() {
  const config = getAppConfig();

  return NextResponse.json({
    status: "ok",
    service: config.appName,
    environment: config.appEnv,
    baseUrl: config.baseUrl,
    timestamp: new Date().toISOString(),
    integrations: {
      whatsappProvider: config.whatsappProvider,
      geminiEnabled: geminiEnabled(),
    },
    storage: {
      backend: config.runtimeBackend,
      runtimeFile: config.runtimeFile,
    },
  });
}
