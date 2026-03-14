export type WhatsAppProvider = "mock" | "cloud";

interface SendWhatsAppTextInput {
  to: string;
  text: string;
}

function getProvider(): WhatsAppProvider {
  return process.env.WHATSAPP_PROVIDER === "cloud" ? "cloud" : "mock";
}

function getCloudConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "",
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function getWhatsAppProvider() {
  return getProvider();
}

export function getWhatsAppVerifyToken() {
  return getCloudConfig().verifyToken;
}

export function cloudWhatsAppReady() {
  const config = getCloudConfig();
  return Boolean(config.accessToken && config.phoneNumberId && config.verifyToken);
}

export async function sendWhatsAppText({ to, text }: SendWhatsAppTextInput) {
  const provider = getProvider();
  if (provider === "mock") {
    return {
      provider,
      delivered: true,
      mock: true,
      to: normalizePhone(to),
      text,
    };
  }

  const { accessToken, phoneNumberId } = getCloudConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp Cloud API is not configured");
  }

  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "text",
      text: {
        body: text,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp Cloud API request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return {
    provider,
    delivered: true,
    mock: false,
    payload,
  };
}
