"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessRoute, navigationByRole } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

export function AuthGate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const sessionUserId = useAppStore((state) => state.sessionUserId);
  const systemMode = useAppStore((state) => state.systemMode);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!sessionUserId) {
      router.replace(`/login?system=${systemMode}`);
      return;
    }

    if (!currentUser) {
      return;
    }

    const route = pathname.split("/")[1] === "dashboard" ? "dashboard" : pathname.split("/")[1];
    const normalizedRoute = route === "" ? "dashboard" : route;

    if (!canAccessRoute(currentUser, normalizedRoute)) {
      const fallbackRoute = navigationByRole[currentUser.role].find((routeKey) => canAccessRoute(currentUser, routeKey)) ?? "dashboard";
      router.replace(`/${fallbackRoute}`);
    }
  }, [currentUser, pathname, router, sessionUserId, systemMode]);

  if (!sessionUserId || !currentUser) {
    return <div className="loading-screen">Cargando superficie operativa...</div>;
  }

  return <>{children}</>;
}
