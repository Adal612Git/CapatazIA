import { NextRequest, NextResponse } from "next/server";
import { buildMobileSession } from "@/lib/mobile-backend";
import type { SystemMode } from "@/lib/types";

function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const session = await buildMobileSession(userId, systemMode);
  if (!session) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
