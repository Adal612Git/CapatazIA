import { NextRequest } from "next/server";
import { createTaskInRuntime, errorResponse, okResponse, resolveSystemMode } from "@/lib/api-v1";
import { taskMutationSchema } from "@/lib/contracts";
import { getRuntimeSyncPayload } from "@/lib/capataz-operativo";

export async function GET(request: NextRequest) {
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));
  const status = request.nextUrl.searchParams.get("status");
  const priority = request.nextUrl.searchParams.get("priority");
  const assigneeId = request.nextUrl.searchParams.get("assigneeId");
  const payload = await getRuntimeSyncPayload(systemMode);

  const data = payload.tasks
    .filter((task) => (status ? task.columnId === status : true))
    .filter((task) => (priority ? task.priority === priority : true))
    .filter((task) => (assigneeId ? task.assigneeId === assigneeId : true))
    .map((task) => {
      const assignee = payload.users.find((user) => user.id === task.assigneeId);
      return {
        ...task,
        assignee: assignee
          ? {
              id: assignee.id,
              name: assignee.name,
              role: assignee.role,
              site: assignee.site,
            }
          : null,
      };
    });

  return okResponse(data, {
    systemMode,
    extraMeta: {
      total: data.length,
      status: status ?? "all",
      priority: priority ?? "all",
      assigneeId: assigneeId ?? "all",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = taskMutationSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", "No se pudo validar la solicitud.", {
      details: parsed.error.flatten(),
    });
  }

  const result = await createTaskInRuntime(parsed.data);
  if (!result.ok) {
    return errorResponse(result.status, result.code, result.message, {
      systemMode: parsed.data.systemMode,
      details: "details" in result ? result.details : undefined,
    });
  }

  return okResponse(result.task, {
    status: 201,
    systemMode: parsed.data.systemMode,
    extraMeta: {
      createdBy: parsed.data.actorId,
      assigneeId: result.assignee.id,
    },
  });
}
