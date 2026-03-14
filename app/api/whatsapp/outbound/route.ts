import { NextRequest, NextResponse } from "next/server";
import { registerOutboundAssistantMessage } from "@/lib/capataz-operativo";
import { getWhatsAppProvider, sendWhatsAppText } from "@/lib/channels/whatsapp";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    phone?: string;
    text?: string;
  };

  if (!body.phone || !body.text?.trim()) {
    return NextResponse.json({ error: "phone and text are required" }, { status: 400 });
  }

  const delivery = await sendWhatsAppText({
    to: body.phone,
    text: body.text.trim(),
  });

  const thread = await registerOutboundAssistantMessage({
    phone: body.phone,
    text: body.text.trim(),
    channel: getWhatsAppProvider() === "cloud" ? "whatsapp_cloud" : "mock_whatsapp",
  });

  return NextResponse.json({
    delivery,
    thread,
  });
}
