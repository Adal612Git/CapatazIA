import { LoginPageClient } from "@/components/login-page-client";
import type { SystemMode } from "@/lib/types";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ system?: string }>;
}) {
  const params = await searchParams;
  const systemMode = (params.system === "hospital" ? "hospital" : "automotive") as SystemMode;

  return <LoginPageClient requestedSystem={systemMode} />;
}
