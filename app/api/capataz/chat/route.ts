import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppProvider } from "@/lib/channels/whatsapp";
import { getConversationSnapshot, handleCapatazMessage } from "@/lib/capataz-operativo";
import type { SystemMode } from "@/lib/types";

function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone");
  const systemMode = resolveSystemMode(request.nextUrl.searchParams.get("systemMode"));

  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const snapshot = await getConversationSnapshot(phone, "mock_whatsapp", systemMode);
  return NextResponse.json({
    provider: getWhatsAppProvider(),
    ...snapshot,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    phone?: string;
    text?: string;
    systemMode?: SystemMode;
  };

  if (!body.phone || !body.text?.trim()) {
    return NextResponse.json({ error: "phone and text are required" }, { status: 400 });
  }

  const result = await handleCapatazMessage({
    phone: body.phone,
    text: body.text.trim(),
    systemMode: resolveSystemMode(body.systemMode),
  });

  return NextResponse.json({
    provider: getWhatsAppProvider(),
    ...result,
  });
}
