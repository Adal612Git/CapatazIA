"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { MessageCircleMore, ShieldCheck, Sparkles } from "lucide-react";
import { getAssistantPersonaForUserId } from "@/lib/assistant-personas";
import { TtsPlayButton } from "@/components/tts-play-button";
import { getDomainConfig } from "@/lib/domain-config";
import { useAppStore } from "@/lib/store";

type DemoUser = {
  id: string;
  label: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  site: string;
  statusLabel: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
  media?: {
    kind: "chart";
    url: string;
    alt: string;
  };
};

type ChatPayload = {
  messages?: ChatMessage[];
  mode?: string;
  provider?: string;
  latestAnalysis?: {
    summary?: string;
    intent?: string;
  } | null;
  latestReport?: {
    title: string;
    body: string;
  } | null;
};

const roleLabel: Record<string, string> = {
  admin: "Admin / Director",
  owner: "Owner / Direccion",
  supervisor: "Supervisor / Gerencia",
  operator: "Operador / Campo",
};

export default function DemoWhatsAppPage() {
  const initialize = useAppStore((state) => state.initialize);
  const users = useAppStore((state) => state.users);
  const systemMode = useAppStore((state) => state.systemMode);
  const domain = getDomainConfig(systemMode);
  const demoUsers = useMemo(
    () =>
      users
        .filter((user) => Boolean(user.phone))
        .map((user) => ({
          id: user.id,
          label: user.avatar,
          name: user.name,
          email: user.email,
          password: user.password,
          phone: user.phone as string,
          role: roleLabel[user.role] ?? user.role,
          site: user.site,
          statusLabel: user.statusLabel,
        })),
    [users],
  );
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("rules");
  const [provider, setProvider] = useState("mock");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("Sin lectura todavia.");
  const [lastReport, setLastReport] = useState<ChatPayload["latestReport"]>(null);

  const resolvedSelectedUserId = demoUsers.some((user) => user.id === selectedUserId) ? selectedUserId : (demoUsers[0]?.id ?? "");
  const selectedUser = useMemo(() => demoUsers.find((user) => user.id === resolvedSelectedUserId) ?? demoUsers[0] ?? null, [demoUsers, resolvedSelectedUserId]);
  const assistantPersona = getAssistantPersonaForUserId(selectedUser?.id);
  const resolvedInput = input || domain.quickPrompts[2] || "reporte general";

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedUser?.phone) {
      return;
    }

    async function loadConversation() {
      setLoading(true);
      const response = await fetch(
        `/api/capataz/chat?phone=${encodeURIComponent(selectedUser.phone)}&systemMode=${encodeURIComponent(systemMode)}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as ChatPayload;

      if (cancelled) {
        return;
      }

      setMessages(payload.messages ?? []);
      setMode(payload.mode ?? "rules");
      setProvider(payload.provider ?? "mock");
      setSummary(payload.latestAnalysis?.summary ?? "Sin lectura todavia.");
      setLastReport(payload.latestReport ?? null);
      setLoading(false);
    }

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, [selectedUser, systemMode]);

  async function sendMessage(text: string) {
    if (!text.trim() || !selectedUser?.phone) {
      return;
    }

    setLoading(true);
    const response = await fetch("/api/capataz/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: selectedUser.phone,
        text,
        systemMode,
      }),
    });

    const payload = (await response.json()) as ChatPayload;
    setMessages(payload.messages ?? []);
    setMode(payload.mode ?? "rules");
    setProvider(payload.provider ?? "mock");
    setSummary(payload.latestAnalysis?.summary ?? "Sin lectura todavia.");
    setLastReport(payload.latestReport ?? null);
    setInput("");
    setLoading(false);
  }

  if (!selectedUser) {
    return <main className="loading-screen">Cargando demo de WhatsApp...</main>;
  }

  return (
    <main className="demo-whatsapp-page">
      <div className="demo-chat-main">
        <div className="demo-chat-shell">
          <div className="demo-chat-header">
            <div className="module-heading">
              <p className="eyebrow">WhatsApp demo</p>
              <h1>Consola conversacional premium para Capataz</h1>
              <p className="module-copy">
                Usa el mismo elenco operativo del dashboard para probar conversaciones coherentes por rol en {domain.reportContext}.
              </p>
            </div>
            <div className="chip-row">
              <span className="report-chip">
                <MessageCircleMore size={14} />
                provider {provider}
              </span>
              <span className="report-chip">
                <ShieldCheck size={14} />
                IA {mode}
              </span>
            </div>
          </div>

          <div className="demo-chat-grid">
            <aside className="panel demo-chat-sidebar">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Colaboradores</p>
                  <h3>Roster operativo</h3>
                </div>
                <span className="demo-chat-icon">
                  <Sparkles size={16} />
                </span>
              </div>
              <div className="demo-chat-roster">
                {demoUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`credential-card ${user.id === resolvedSelectedUserId ? "active" : ""}`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="panel-header">
                      <strong>
                        {user.label} {user.name}
                      </strong>
                      <span className="pill pill-muted">{user.role}</span>
                    </div>
                    <div className="demo-chat-user-meta">
                      <span>{user.site}</span>
                      <span>email: {user.email}</span>
                      <span>pass: {user.password}</span>
                      <span>whats: {user.phone}</span>
                      <span>{user.statusLabel}</span>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="panel demo-chat-thread-shell">
              <header className="demo-chat-thread-head">
                <strong>{selectedUser.name}</strong>
                <div>{selectedUser.phone}</div>
                <div>
                  {assistantPersona.displayName} | {assistantPersona.toneLabel}
                </div>
              </header>

              <div className="demo-chat-balance detail-card">
                <div>
                  <strong>Lectura actual</strong>
                  <p>{summary}</p>
                </div>
                {lastReport ? (
                  <div>
                    <strong>Ultimo reporte</strong>
                    <p>{lastReport.title}</p>
                  </div>
                ) : null}
              </div>

              <div className="demo-chat-thread">
                {messages.map((message) => (
                  <div key={message.id} className={`demo-chat-bubble ${message.role}`}>
                    <div className="demo-chat-bubble-head">
                      <div>
                        {message.role === "user" ? selectedUser.label : message.role === "assistant" ? assistantPersona.displayName : "Sistema"}
                      </div>
                      {message.role === "assistant" ? (
                        <TtsPlayButton
                          text={message.text}
                          label={`Reproducir mensaje de ${assistantPersona.displayName}`}
                          userId={selectedUser.id}
                          preferredVoiceNames={assistantPersona.preferredVoiceNames}
                        />
                      ) : null}
                    </div>
                    {message.text}
                    {message.media?.kind === "chart" ? <img className="whatsapp-chart" src={message.media.url} alt={message.media.alt} /> : null}
                  </div>
                ))}

                {!messages.length ? <div className="status">No hay conversacion todavia.</div> : null}
              </div>

              <div className="demo-chat-quick-actions">
                {domain.quickPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="button-ghost" onClick={() => setInput(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                className="copilot-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(resolvedInput);
                }}
              >
                <textarea
                  value={resolvedInput}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Escribe como si fueras el colaborador..."
                  rows={3}
                />
                <button className="button-primary" type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
