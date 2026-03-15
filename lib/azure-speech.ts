function getAzureSpeechConfig() {
  return {
    key: process.env.AZURE_SPEECH_KEY?.trim() || "",
    region: process.env.AZURE_SPEECH_REGION?.trim() || "",
  };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function azureSpeechReady() {
  const config = getAzureSpeechConfig();
  return Boolean(config.key && config.region);
}

export async function synthesizeAzureSpeech({
  text,
  voice,
}: {
  text: string;
  voice: string;
}) {
  const config = getAzureSpeechConfig();
  if (!config.key || !config.region) {
    throw new Error("Azure Speech is not configured");
  }

  const endpoint = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = [
    '<speak version="1.0" xml:lang="es-MX">',
    `  <voice name="${voice}">`,
    `    <prosody rate="0%" pitch="0%">${escapeXml(text)}</prosody>`,
    "  </voice>",
    "</speak>",
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      "User-Agent": "capataz-ai-demo",
    },
    body: ssml,
  });

  if (!response.ok) {
    throw new Error(`Azure Speech request failed with status ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
