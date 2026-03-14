"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/module-header";
import { capatazContracts } from "@/lib/contracts";
import { useAppStore, useCurrentUser } from "@/lib/store";
import type { BroadcastAudience, BroadcastFrequency, ScheduledBroadcast } from "@/lib/types";

type BroadcastDraft = Pick<
  ScheduledBroadcast,
  "title" | "message" | "audioLabel" | "audience" | "frequency" | "timeOfDay" | "timezone" | "active"
>;

const audienceOptions: Array<{ value: BroadcastAudience; label: string }> = [
  { value: "all_staff", label: "Todo el personal" },
  { value: "sales_only", label: "Solo ventas" },
  { value: "service_only", label: "Solo servicio" },
];

const frequencyOptions: Array<{ value: BroadcastFrequency; label: string }> = [
  { value: "daily", label: "Diario" },
  { value: "weekdays", label: "Lunes a viernes" },
];

function buildDrafts(broadcasts: ScheduledBroadcast[]) {
  return Object.fromEntries(
    broadcasts.map((broadcast) => [
      broadcast.id,
      {
        title: broadcast.title,
        message: broadcast.message,
        audioLabel: broadcast.audioLabel ?? "",
        audience: broadcast.audience,
        frequency: broadcast.frequency,
        timeOfDay: broadcast.timeOfDay,
        timezone: broadcast.timezone,
        active: broadcast.active,
      },
    ]),
  ) as Record<string, BroadcastDraft>;
}

export default function SettingsPage() {
  const currentUser = useCurrentUser();
  const workspace = useAppStore((state) => state.workspace);
  const users = useAppStore((state) => state.users);
  const columns = useAppStore((state) => state.columns);
  const scheduledBroadcasts = useAppStore((state) => state.scheduledBroadcasts);
  const addColumn = useAppStore((state) => state.addColumn);
  const updateScheduledBroadcast = useAppStore((state) => state.updateScheduledBroadcast);
  const runScheduledBroadcastNow = useAppStore((state) => state.runScheduledBroadcastNow);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#ef7d38");
  const [drafts, setDrafts] = useState<Record<string, BroadcastDraft>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(buildDrafts(scheduledBroadcasts));
  }, [scheduledBroadcasts]);

  const orgSummary = useMemo(() => {
    const groups = Array.from(new Set(users.map((user) => user.groupId)));
    const brands = Array.from(new Set(users.map((user) => user.brandId)));
    const sites = Array.from(
      new Map(
        users
          .filter((user) => user.siteId !== "site-corporativo")
          .map((user) => [user.siteId, { siteId: user.siteId, site: user.site, managers: 0, totalUsers: 0 }]),
      ).values(),
    ).map((site) => ({
      ...site,
      managers: users.filter((user) => user.siteId === site.siteId && user.role !== "operator").length,
      totalUsers: users.filter((user) => user.siteId === site.siteId).length,
    }));

    return { groups, brands, sites };
  }, [users]);

  async function saveBroadcast(broadcastId: string) {
    if (!currentUser) {
      return;
    }

    setBusyId(broadcastId);
    setStatusMessage(null);
    const draft = drafts[broadcastId];
    const result = await updateScheduledBroadcast(broadcastId, draft, currentUser.id);
    setBusyId(null);
    setStatusMessage(result.ok ? "Broadcast actualizado." : result.message ?? "No se pudo actualizar el broadcast.");
  }

  async function triggerBroadcast(broadcastId: string) {
    if (!currentUser) {
      return;
    }

    setBusyId(broadcastId);
    setStatusMessage(null);
    const result = await runScheduledBroadcastNow(broadcastId, currentUser.id);
    setBusyId(null);
    setStatusMessage(result.ok ? result.message ?? "Broadcast enviado." : result.message ?? "No se pudo ejecutar el broadcast.");
  }

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Gobierno del sistema"
        title="Configuracion automotriz"
        description="Controla alcance organizacional, tablero operativo y broadcasts diarios del grupo."
      />

      {statusMessage ? <div className="status status-warning">{statusMessage}</div> : null}

      <section className="settings-grid">
        <article className="panel stack-md">
          <div>
            <p className="eyebrow">Workspace</p>
            <h3>{workspace.name}</h3>
            <p>{workspace.tagline}</p>
          </div>
          <div className="report-row">
            <strong>Industria</strong>
            <p>{workspace.industry}</p>
          </div>
          <div className="report-row">
            <strong>Timezone</strong>
            <p>{workspace.timezone}</p>
          </div>
          <div className="report-row">
            <strong>Usuario actual</strong>
            <p>{currentUser ? `${currentUser.name} | ${currentUser.role}` : "Sin sesion"}</p>
          </div>
        </article>

        <article className="panel stack-md">
          <div>
            <p className="eyebrow">Alcance real</p>
            <h3>IDs de grupo, marca y sede</h3>
          </div>
          <div className="report-row">
            <strong>Grupo(s)</strong>
            <p>{orgSummary.groups.join(", ")}</p>
          </div>
          <div className="report-row">
            <strong>Marca(s)</strong>
            <p>{orgSummary.brands.join(", ")}</p>
          </div>
          <div className="stack-sm">
            {orgSummary.sites.map((site) => (
              <div key={site.siteId} className="report-row">
                <strong>{site.site}</strong>
                <p>
                  {site.siteId} | {site.totalUsers} usuarios | {site.managers} gerencias
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="settings-grid">
        <article className="panel stack-md">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Broadcasts</p>
              <h3>Himno, cortes y convocatorias</h3>
            </div>
          </div>

          <div className="stack-md">
            {scheduledBroadcasts.map((broadcast) => {
              const draft = drafts[broadcast.id];
              if (!draft) {
                return null;
              }

              return (
                <article key={broadcast.id} className="detail-card stack-sm">
                  <div className="report-row">
                    <strong>{broadcast.id}</strong>
                    <p>{broadcast.lastSentOn ? `Ultimo envio: ${broadcast.lastSentOn}` : "Sin envios hoy"}</p>
                  </div>
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [broadcast.id]: { ...current[broadcast.id], title: event.target.value },
                      }))
                    }
                    placeholder="Titulo del broadcast"
                  />
                  <textarea
                    rows={3}
                    value={draft.message}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [broadcast.id]: { ...current[broadcast.id], message: event.target.value },
                      }))
                    }
                    placeholder="Mensaje operativo"
                  />
                  <input
                    value={draft.audioLabel}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [broadcast.id]: { ...current[broadcast.id], audioLabel: event.target.value },
                      }))
                    }
                    placeholder="Audio opcional"
                  />
                  <div className="settings-grid">
                    <label className="stack-xs">
                      <span>Audiencia</span>
                      <select
                        value={draft.audience}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [broadcast.id]: {
                              ...current[broadcast.id],
                              audience: event.target.value as BroadcastAudience,
                            },
                          }))
                        }
                      >
                        {audienceOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="stack-xs">
                      <span>Frecuencia</span>
                      <select
                        value={draft.frequency}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [broadcast.id]: {
                              ...current[broadcast.id],
                              frequency: event.target.value as BroadcastFrequency,
                            },
                          }))
                        }
                      >
                        {frequencyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="stack-xs">
                      <span>Hora</span>
                      <input
                        type="time"
                        value={draft.timeOfDay}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [broadcast.id]: { ...current[broadcast.id], timeOfDay: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="stack-xs">
                      <span>Timezone</span>
                      <input
                        value={draft.timezone}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [broadcast.id]: { ...current[broadcast.id], timezone: event.target.value },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="report-row">
                    <strong>Activo</strong>
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [broadcast.id]: { ...current[broadcast.id], active: event.target.checked },
                        }))
                      }
                    />
                  </label>
                  <div className="inline-form">
                    <button className="button-primary" type="button" onClick={() => void saveBroadcast(broadcast.id)} disabled={busyId === broadcast.id}>
                      Guardar
                    </button>
                    <button className="button-ghost" type="button" onClick={() => void triggerBroadcast(broadcast.id)} disabled={busyId === broadcast.id}>
                      Enviar ahora
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="panel stack-md">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Columnas</p>
              <h3>Configurar tablero</h3>
            </div>
          </div>
          <div className="stack-sm">
            {columns.map((column) => (
              <div key={column.id} className="report-row">
                <strong>{column.title}</strong>
                <p>{column.limit ? `WIP ${column.limit}` : "Sin limite"}</p>
              </div>
            ))}
          </div>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim()) {
                return;
              }
              addColumn(title.trim(), color);
              setTitle("");
            }}
          >
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nueva columna" />
            <input value={color} onChange={(event) => setColor(event.target.value)} type="color" />
            <button className="button-primary" type="submit">
              Agregar
            </button>
          </form>
        </article>
      </section>

      <section className="panel stack-md">
        <div>
          <p className="eyebrow">Contratos activos</p>
          <h3>Base exacta para dashboard y runtime</h3>
        </div>
        <pre className="code-block">{JSON.stringify(capatazContracts, null, 2)}</pre>
      </section>
    </div>
  );
}
