import { NextRequest, NextResponse } from "next/server";
import { getRuntimeSyncPayload, replaceRuntimeSyncPayload } from "@/lib/capataz-operativo";
import type { RuntimeSyncPayload } from "@/lib/types";

export async function GET() {
  const payload = await getRuntimeSyncPayload();
  return NextResponse.json(payload);
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as Partial<RuntimeSyncPayload>;

  if (
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
    !body.reports ||
    !body.notes ||
    !body.suggestions
  ) {
    return NextResponse.json({ error: "Invalid runtime sync payload" }, { status: 400 });
  }

  const payload = await replaceRuntimeSyncPayload({
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
    reports: body.reports,
    notes: body.notes,
    suggestions: body.suggestions,
  });

  return NextResponse.json(payload);
}
