import { NextRequest, NextResponse } from "next/server";
import { handleCapatazMessage } from "@/lib/capataz-operativo";
import { getWhatsAppVerifyToken, sendWhatsAppText } from "@/lib/channels/whatsapp";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = request.nextUrl.searchParams.get("hub.verify_token");

  if (mode === "subscribe" && challenge && verifyToken === getWhatsAppVerifyToken()) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from?: string;
            type?: string;
            text?: {
              body?: string;
            };
          }>;
        };
      }>;
    }>;
  };

  const messages =
    payload.entry
      ?.flatMap((entry) => entry.changes ?? [])
      .flatMap((change) => change.value?.messages ?? [])
      .filter((message) => message.type === "text" && message.from && message.text?.body) ?? [];

  for (const message of messages) {
    const result = await handleCapatazMessage({
      phone: message.from as string,
      text: message.text?.body as string,
      channel: "whatsapp_cloud",
    });

    if (result.reply) {
      await sendWhatsAppText({
        to: message.from as string,
        text: result.reply,
      });
    }
  }

  return NextResponse.json({ received: true });
}
