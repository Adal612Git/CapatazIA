import { NextRequest } from "next/server";
import { buildExecutiveReport, errorResponse, okResponse, persistReportInRuntime } from "@/lib/api-v1";
import { reportRequestSchema } from "@/lib/contracts";
import { getRuntimeSyncPayload } from "@/lib/capataz-operativo";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = reportRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", "No se pudo validar la solicitud del reporte.", {
      details: parsed.error.flatten(),
    });
  }

  const payload = await getRuntimeSyncPayload(parsed.data.systemMode);
  const actor = payload.users.find((user) => user.id === parsed.data.actorId);
  if (!actor) {
    return errorResponse(404, "ACTOR_NOT_FOUND", "No se encontro el actor solicitado.", {
      systemMode: parsed.data.systemMode,
    });
  }

  const report = buildExecutiveReport(payload, {
    kind: parsed.data.kind,
    targetUserId: parsed.data.targetUserId,
  });

  if (parsed.data.persist) {
    await persistReportInRuntime(parsed.data.systemMode, report);
  }

  return okResponse(report, {
    systemMode: parsed.data.systemMode,
    extraMeta: {
      persisted: parsed.data.persist,
      requestedBy: actor.id,
    },
  });
}
