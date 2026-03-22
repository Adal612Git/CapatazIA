import { NextRequest, NextResponse } from "next/server";
import { getDashboardCopilotSnapshot, handleDashboardCopilotMessage } from "@/lib/capataz-operativo";
import type { SystemMode } from "@/lib/types";

function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const currentPath = request.nextUrl.searchParams.get("currentPath");
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const snapshot = await getDashboardCopilotSnapshot({
    userId,
    systemMode,
    currentPath,
  });

  if (!snapshot) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    userId?: string;
    text?: string;
    currentPath?: string | null;
    systemMode?: SystemMode;
  };

  if (!body.userId || !body.text?.trim()) {
    return NextResponse.json({ error: "userId and text are required" }, { status: 400 });
  }

  const result = await handleDashboardCopilotMessage({
    userId: body.userId,
    text: body.text.trim(),
    currentPath: body.currentPath ?? null,
    systemMode: resolveSystemMode(body.systemMode),
  });

  return NextResponse.json(result);
}
