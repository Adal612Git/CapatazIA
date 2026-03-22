import { NextRequest, NextResponse } from "next/server";
import { generateUserSummaryChartSvg } from "@/lib/capataz-operativo";
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

  const svg = await generateUserSummaryChartSvg(userId, systemMode);
  if (!svg) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
