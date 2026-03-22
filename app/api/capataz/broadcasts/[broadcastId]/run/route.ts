import { NextRequest, NextResponse } from "next/server";
import { runScheduledBroadcastNow } from "@/lib/capataz-operativo";
import type { SystemMode } from "@/lib/types";

function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

export async function POST(request: NextRequest, context: { params: Promise<{ broadcastId: string }> }) {
  const { broadcastId } = await context.params;
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));
  const result = await runScheduledBroadcastNow(broadcastId, systemMode);

  if (!result.ok) {
    return NextResponse.json({ error: "Broadcast no encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}
