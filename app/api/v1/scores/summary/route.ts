import { NextRequest } from "next/server";
import { buildScoresSummary, okResponse, resolveSystemMode } from "@/lib/api-v1";
import { getRuntimeSyncPayload } from "@/lib/capataz-operativo";

export async function GET(request: NextRequest) {
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));
  const payload = await getRuntimeSyncPayload(systemMode);

  return okResponse(buildScoresSummary(payload), {
    systemMode,
    extraMeta: {
      totalPeople: payload.scoreSnapshots.length,
    },
  });
}
