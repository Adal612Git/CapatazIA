import { z } from "zod";

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

interface GeminiRequest {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || "";
}

function stripCodeFences(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
}

async function callGemini({ systemPrompt, userPrompt, maxOutputTokens = 400 }: GeminiRequest) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`);
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.25,
        topP: 0.9,
        maxOutputTokens,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  return text || null;
}

export function geminiEnabled() {
  return Boolean(getGeminiApiKey());
}

export async function generateGeminiText({ systemPrompt, userPrompt, maxOutputTokens }: GeminiRequest) {
  const text = await callGemini({ systemPrompt, userPrompt, maxOutputTokens });
  return text ? stripCodeFences(text) : null;
}

export async function generateGeminiJson<T>({
  systemPrompt,
  userPrompt,
  schema,
  maxOutputTokens = 700,
}: GeminiRequest & {
  schema: z.ZodType<T>;
}) {
  const text = await callGemini({
    systemPrompt: `${systemPrompt}\nDevuelve solo JSON valido. Sin markdown, sin comentarios, sin texto extra.`,
    userPrompt,
    maxOutputTokens,
  });

  if (!text) {
    return null;
  }

  const parsed = JSON.parse(stripCodeFences(text));
  return schema.parse(parsed);
}
