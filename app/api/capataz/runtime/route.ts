import { NextRequest, NextResponse } from "next/server";
import { getRuntimeSyncPayload, replaceRuntimeSyncPayload } from "@/lib/capataz-operativo";
import type { RuntimeSyncPayload, SystemMode } from "@/lib/types";

function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

export async function GET(request: NextRequest) {
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));
  const payload = await getRuntimeSyncPayload(systemMode);
  return NextResponse.json(payload);
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as Partial<RuntimeSyncPayload>;

  if (
    !body.systemMode ||
    !body.users ||
    !body.tasks ||
    !body.checklists ||
    !body.alerts ||
    !body.activity ||
    !body.prospects ||
    !body.testDrives ||
    !body.salesOperations ||
    !body.creditFiles ||
    !body.bellIncidents ||
    !body.postSaleFollowUps ||
    !body.scheduledBroadcasts ||
    !body.financeAccounts ||
    !body.financeMovements ||
    !body.financeApplications ||
    !body.financeInsights ||
    !body.scoreSnapshots ||
    !body.weekly ||
    !body.reports ||
    !body.notes ||
    !body.suggestions
  ) {
    return NextResponse.json({ error: "Invalid runtime sync payload" }, { status: 400 });
  }

  const payload = await replaceRuntimeSyncPayload({
    systemMode: body.systemMode,
    users: body.users,
    tasks: body.tasks,
    checklists: body.checklists,
    alerts: body.alerts,
    activity: body.activity,
    prospects: body.prospects,
    testDrives: body.testDrives,
    salesOperations: body.salesOperations,
    creditFiles: body.creditFiles,
    bellIncidents: body.bellIncidents,
    postSaleFollowUps: body.postSaleFollowUps,
    scheduledBroadcasts: body.scheduledBroadcasts,
    financeAccounts: body.financeAccounts,
    financeMovements: body.financeMovements,
    financeApplications: body.financeApplications,
    financeInsights: body.financeInsights,
    scoreSnapshots: body.scoreSnapshots,
    weekly: body.weekly,
    reports: body.reports,
    notes: body.notes,
    suggestions: body.suggestions,
  });

  return NextResponse.json(payload);
}
