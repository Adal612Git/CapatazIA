"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  BriefcaseBusiness,
  CreditCard,
  Gauge,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessageCircleMore,
  Radar,
  RefreshCw,
  Route,
  Settings,
  Shield,
  Siren,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { CapatazCopilot } from "@/components/capataz-copilot";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { getDepartmentLabel, getDomainConfig } from "@/lib/domain-config";
import { canAccessRoute, canCreateTasks, navigationByRole } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";

const navItems = [
  { key: "dashboard", label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { key: "junta", label: "Junta", href: "/junta", icon: BriefcaseBusiness },
  { key: "pipeline", label: "Pipeline", href: "/pipeline", icon: Route },
  { key: "tasks", label: "Tareas", href: "/tasks", icon: ListTodo },
  { key: "kanban", label: "Kanban", href: "/kanban", icon: KanbanSquare },
  { key: "team", label: "Equipo", href: "/team", icon: Users },
  { key: "postventa", label: "Post-venta", href: "/postventa", icon: UsersRound },
  { key: "campana", label: "Campana", href: "/campana", icon: Siren },
  { key: "multisucursal", label: "Agencias", href: "/multisucursal", icon: Building2 },
  { key: "score", label: "Score", href: "/score", icon: Gauge },
  { key: "fintech", label: "Fintech", href: "/fintech", icon: CreditCard },
  { key: "reports", label: "Reportes", href: "/reports", icon: Radar },
  { key: "checklists", label: "Checklists", href: "/checklists", icon: Shield },
  { key: "alerts", label: "Alertas", href: "/alerts", icon: Bell },
  { key: "whatsapp", label: "WhatsApp", href: "/whatsapp", icon: MessageCircleMore },
  { key: "settings", label: "Configuracion", href: "/settings", icon: Settings },
];

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const sessionUserId = useAppStore((state) => state.sessionUserId);
  const systemMode = useAppStore((state) => state.systemMode);
  const workspace = useAppStore((state) => state.workspace);
  const alerts = useAppStore((state) => state.alerts);
  const tasks = useAppStore((state) => state.tasks);
  const logout = useAppStore((state) => state.logout);
  const switchSystemMode = useAppStore((state) => state.switchSystemMode);
  const syncRuntimeFromServer = useAppStore((state) => state.syncRuntimeFromServer);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSeed, setDialogSeed] = useState(0);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const domain = getDomainConfig(systemMode);
  const shellThemeClass =
    pathname === "/fintech"
      ? "app-shell-fintech"
      : systemMode === "hospital"
        ? "app-shell-hospital"
        : "app-shell-automotive";

  async function runSync(showSpinner: boolean) {
    if (syncInFlightRef.current) {
      return syncInFlightRef.current;
    }

    if (showSpinner) {
      setSyncing(true);
    }
    const syncPromise = syncRuntimeFromServer().finally(() => {
      syncInFlightRef.current = null;
      if (showSpinner) {
        setSyncing(false);
      }
    });

    syncInFlightRef.current = syncPromise;
    return syncPromise;
  }

  useEffect(() => {
    if (!sessionUserId) {
      return;
    }

    void syncRuntimeFromServer();
    const intervalId = window.setInterval(() => {
      void syncRuntimeFromServer();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [sessionUserId, syncRuntimeFromServer]);

  return (
    <AuthGate>
      <div className={`app-shell ${shellThemeClass}`}>
        <aside className="sidebar">
          <div className="brand-card panel">
            <div className="brand-mark-shell">
              <Image alt="Capataz.ai" className="brand-mark-image" height={58} priority src="/brand/logo.png" width={58} />
            </div>
            <div className="brand-identity">
              <p className="eyebrow">{domain.systemBadge}</p>
              <h2 className="brand-wordmark">Capataz.ai</h2>
              <p>{workspace.industry}</p>
            </div>
          </div>

          <nav className="nav-stack">
            {currentUser
              ? navItems
                  .filter((item) => navigationByRole[currentUser.role].includes(item.key) && canAccessRoute(currentUser, item.key))
                  .map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link key={item.key} className={`nav-link ${active ? "nav-link-active" : ""}`} href={item.href}>
                        <span>
                          <Icon size={18} />
                          {domain.navLabels[item.key] ?? item.label}
                        </span>
                        {item.key === "alerts" ? <small>{alerts.filter((alert) => !alert.read).length}</small> : null}
                      </Link>
                    );
                  })
              : null}
          </nav>

          <div className="sidebar-card panel">
            <p className="eyebrow">Pulso del dia</p>
            <div className="mini-stat-grid">
              <div>
                <strong>{tasks.filter((task) => task.columnId !== "done").length}</strong>
                <span>{systemMode === "hospital" ? "Pendientes" : "Abiertas"}</span>
              </div>
              <div>
                <strong>{alerts.filter((alert) => !alert.read).length}</strong>
                <span>{systemMode === "hospital" ? "Riesgos" : "Alertas"}</span>
              </div>
            </div>
            <p className="module-copy">
              {pathname === "/fintech"
                ? "Score, beneficios y credito con la misma claridad operativa."
                : "Lectura inmediata para decidir sin perseguir reportes manuales."}
            </p>
          </div>

          <div className="sidebar-card panel stack-sm">
            <p className="eyebrow">Vertical activa</p>
            <div className="chip-row">
              <button
                className={systemMode === "automotive" ? "button-primary" : "button-secondary"}
                type="button"
                onClick={() => {
                  void switchSystemMode("automotive");
                  router.replace("/login?system=automotive");
                }}
              >
                Autos
              </button>
              <button
                className={systemMode === "hospital" ? "button-primary" : "button-secondary"}
                type="button"
                onClick={() => {
                  void switchSystemMode("hospital");
                  router.replace("/login?system=hospital");
                }}
              >
                Hospitales
              </button>
            </div>
          </div>

          <div className="sidebar-footer panel">
            <span className="pill brand-badge">
              {pathname === "/fintech" ? "Fintech premium" : systemMode === "hospital" ? "Care theme" : "Auto theme"}
            </span>
            <p>{domain.heroDescription}</p>
          </div>
        </aside>

        <div className="content-area">
          <header className="topbar">
            <div>
              <p className="eyebrow">{systemMode === "hospital" ? "Centro de comando" : "Modo operativo"}</p>
              <div className="topbar-title">
                <h3>{currentUser?.name}</h3>
                <span className="pill pill-muted">
                  {currentUser?.role} · {currentUser ? getDepartmentLabel(systemMode, currentUser.department) : ""}
                </span>
              </div>
            </div>
            <div className="topbar-actions">
              {currentUser && canCreateTasks(currentUser.role) ? (
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => {
                    setDialogSeed((value) => value + 1);
                    setDialogOpen(true);
                  }}
                >
                  <Sparkles size={16} />
                  {systemMode === "hospital" ? "Nuevo pendiente" : "Nueva tarea"}
                </button>
              ) : null}
              <button className="button-ghost" type="button" onClick={() => void runSync(true)}>
                <RefreshCw className={syncing ? "spin" : ""} size={16} />
                Sync
              </button>
              <button className="button-ghost" type="button" onClick={logout}>
                <LogOut size={16} />
                Salir
              </button>
            </div>
          </header>

          <main className="workspace">{children}</main>
        </div>

        <TaskDetailSheet />
        <CreateTaskDialog key={dialogSeed} open={dialogOpen} onClose={() => setDialogOpen(false)} />
        <CapatazCopilot />
      </div>
    </AuthGate>
  );
}
