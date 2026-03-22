import { NextRequest, NextResponse } from "next/server";
import { submitMobileCreditApplication } from "@/lib/mobile-backend";
import type { SystemMode } from "@/lib/types";

function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    userId?: string;
    productId?: string;
    amount?: number;
    rationale?: string;
    systemMode?: SystemMode;
  };

  if (!body.userId || !body.productId || typeof body.amount !== "number") {
    return NextResponse.json({ error: "userId, productId and amount are required" }, { status: 400 });
  }

  const result = await submitMobileCreditApplication({
    userId: body.userId,
    productId: body.productId,
    amount: body.amount,
    rationale: body.rationale?.trim() || "Solicitud enviada desde la app movil.",
    systemMode: resolveSystemMode(body.systemMode),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
