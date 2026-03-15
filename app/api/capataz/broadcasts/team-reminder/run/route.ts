import { NextResponse } from "next/server";
import { runTeamReminderNow } from "@/lib/capataz-operativo";

export async function POST() {
  const result = await runTeamReminderNow();
  return NextResponse.json(result);
}
