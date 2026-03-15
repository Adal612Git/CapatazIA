"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Bell,
  Building2,
  BriefcaseBusiness,
  Gauge,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Radar,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  MessageCircleMore,
  Route,
  Siren,
  UsersRound,
  Users,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { canAccessRoute, canCreateTasks, departmentLabel, navigationByRole } from "@/lib/permissions";
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
  const currentUser = useCurrentUser();
  const sessionUserId = useAppStore((state) => state.sessionUserId);
  const workspace = useAppStore((state) => state.workspace);
  const alerts = useAppStore((state) => state.alerts);
  const tasks = useAppStore((state) => state.tasks);
  const logout = useAppStore((state) => state.logout);
  const syncRuntimeFromServer = useAppStore((state) => state.syncRuntimeFromServer);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSeed, setDialogSeed] = useState(0);
  const syncInFlightRef = useRef<Promise<void> | null>(null);

  const runSync = useEffectEvent(async () => {
    if (syncInFlightRef.current) {
      return syncInFlightRef.current;
    }

    setSyncing(true);
    const syncPromise = syncRuntimeFromServer().finally(() => {
      syncInFlightRef.current = null;
      setSyncing(false);
    });

    syncInFlightRef.current = syncPromise;
    return syncPromise;
  });

  useEffect(() => {
    if (!sessionUserId) {
      return;
    }

    void runSync();
    const intervalId = window.setInterval(() => {
      void runSync();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [sessionUserId]);

  return (
    <AuthGate>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-card panel">
            <div className="brand-mark-shell">
              <Image alt="Capataz.ai" className="brand-mark-image" height={58} priority src="/brand/logo.png" width={58} />
            </div>
            <div className="brand-identity">
              <p className="eyebrow">Capataz.ai</p>
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
                          {item.label}
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
                <span>Abiertas</span>
              </div>
              <div>
                <strong>{alerts.filter((alert) => !alert.read).length}</strong>
                <span>Alertas</span>
              </div>
            </div>
          </div>

          <div className="sidebar-footer panel">
            <span className="pill brand-badge">Naranja operativo</span>
            <p>Pipeline, campana y post-venta bajo una sola identidad visual y un mismo runtime.</p>
          </div>
        </aside>

        <div className="content-area">
          <header className="topbar">
            <div>
              <p className="eyebrow">Modo operativo</p>
              <div className="topbar-title">
                <h3>{currentUser?.name}</h3>
                <span className="pill pill-muted">
                  {currentUser?.role} · {currentUser ? departmentLabel(currentUser.department) : ""}
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
                  Nueva tarea
                </button>
              ) : null}
              <button
                className="button-ghost"
                type="button"
                onClick={() => {
                  void runSync();
                }}
              >
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
      </div>
    </AuthGate>
  );
}
