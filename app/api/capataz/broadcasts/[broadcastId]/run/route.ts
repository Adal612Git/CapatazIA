import { NextResponse } from "next/server";
import { runScheduledBroadcastNow } from "@/lib/capataz-operativo";

export async function POST(_: Request, context: { params: Promise<{ broadcastId: string }> }) {
  const { broadcastId } = await context.params;
  const result = await runScheduledBroadcastNow(broadcastId);

  if (!result.ok) {
    return NextResponse.json({ error: "Broadcast no encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}
