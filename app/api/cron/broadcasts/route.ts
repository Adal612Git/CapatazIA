import { NextRequest, NextResponse } from "next/server";
import { tickRuntimeAutomation } from "@/lib/capataz-operativo";

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const providedSecret = request.headers.get("authorization")?.trim();

  if (expectedSecret && providedSecret !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron call" }, { status: 401 });
  }

  const result = await tickRuntimeAutomation();
  return NextResponse.json(result);
}
