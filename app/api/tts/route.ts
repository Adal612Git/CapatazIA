import { NextRequest, NextResponse } from "next/server";
import { getAssistantPersonaForUserId } from "@/lib/assistant-personas";
import { azureSpeechReady, synthesizeAzureSpeech } from "@/lib/azure-speech";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    text?: string;
    userId?: string;
  };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (!azureSpeechReady()) {
    return NextResponse.json({ error: "Azure Speech is not configured" }, { status: 424 });
  }

  const persona = getAssistantPersonaForUserId(body.userId);
  const audio = await synthesizeAzureSpeech({
    text: body.text.trim(),
    voice: persona.azureVoice,
  });

  return new NextResponse(audio, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
