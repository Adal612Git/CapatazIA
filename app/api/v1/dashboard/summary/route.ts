import { NextRequest } from "next/server";
import { buildDashboardSummary, okResponse, resolveSystemMode } from "@/lib/api-v1";
import { getRuntimeSyncPayload } from "@/lib/capataz-operativo";

export async function GET(request: NextRequest) {
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));
  const userId = request.nextUrl.searchParams.get("userId");
  const payload = await getRuntimeSyncPayload(systemMode);
  const currentUser = userId ? payload.users.find((user) => user.id === userId) ?? null : null;

  return okResponse(buildDashboardSummary(payload, currentUser), {
    systemMode,
    extraMeta: {
      userScope: currentUser?.id ?? "workspace",
    },
  });
}
