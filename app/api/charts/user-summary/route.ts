import { NextRequest, NextResponse } from "next/server";
import { generateUserSummaryChartSvg } from "@/lib/capataz-operativo";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const svg = await generateUserSummaryChartSvg(userId);
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
