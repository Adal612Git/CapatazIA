import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const envExamplePath = path.join(process.cwd(), ".env.example");

test(".env.example documents the required runtime variables", () => {
  const contents = fs.readFileSync(envExamplePath, "utf8");
  const requiredKeys = [
    "APP_ENV",
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_BASE_URL",
    "CAPATAZ_RUNTIME_FILE",
    "WHATSAPP_PROVIDER",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "CRON_SECRET",
  ];

  requiredKeys.forEach((key) => {
    assert.match(contents, new RegExp(`^${key}=`, "m"));
  });
});
