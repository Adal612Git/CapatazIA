import { NextRequest, NextResponse } from "next/server";
import { authenticateMobileUser } from "@/lib/mobile-backend";
import type { SystemMode } from "@/lib/types";

function resolveSystemMode(value: string | null | undefined): SystemMode {
  return value === "hospital" ? "hospital" : "automotive";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    systemMode?: SystemMode;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const session = await authenticateMobileUser(body.email, body.password, resolveSystemMode(body.systemMode));
  if (!session) {
    return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
  }

  return NextResponse.json(session);
}
