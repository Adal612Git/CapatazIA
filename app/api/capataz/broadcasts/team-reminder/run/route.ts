import { NextRequest, NextResponse } from "next/server";
import { runTeamReminderNow } from "@/lib/capataz-operativo";
import type { SystemMode } from "@/lib/types";

function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

export async function POST(request: NextRequest) {
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));
  const result = await runTeamReminderNow(systemMode);
  return NextResponse.json(result);
}
