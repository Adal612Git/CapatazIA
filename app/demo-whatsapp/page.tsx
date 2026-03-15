"use client";

import { useEffect, useMemo, useState } from "react";
import { getAssistantPersonaForUserId } from "@/lib/assistant-personas";
import { TtsPlayButton } from "@/components/tts-play-button";
import { seedData } from "@/lib/seed-data";

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

const demoUsers: DemoUser[] = seedData.users
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
  }));

const quickPrompts = [
  "ayuda",
  "mis tareas",
  "reporte general",
  "mis prospectos",
  "mis seguimientos",
  "campana",
];

export default function DemoWhatsAppPage() {
  const [selectedUserId, setSelectedUserId] = useState<string>(demoUsers[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("reporte general");
  const [mode, setMode] = useState("rules");
  const [provider, setProvider] = useState("mock");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("Sin lectura todavia.");
  const [lastReport, setLastReport] = useState<ChatPayload["latestReport"]>(null);

  const selectedUser = useMemo(
    () => demoUsers.find((user) => user.id === selectedUserId) ?? demoUsers[0],
    [selectedUserId],
  );
  const assistantPersona = getAssistantPersonaForUserId(selectedUser.id);

  useEffect(() => {
    let cancelled = false;

    async function loadConversation() {
      setLoading(true);
      const response = await fetch(`/api/capataz/chat?phone=${encodeURIComponent(selectedUser.phone)}`, {
        cache: "no-store",
      });
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
  }, [selectedUser]);

  async function sendMessage(text: string) {
    if (!text.trim()) {
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

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f1ea",
        color: "#1f1f1f",
        padding: "24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ margin: 0 }}>Demo basica WhatsApp Capataz</h1>
        <p style={{ marginTop: "8px", marginBottom: "24px" }}>
          Vista simple para presentacion. Usa el mismo elenco operativo del dashboard para probar conversaciones coherentes por rol.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: "16px",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "16px",
              padding: "16px",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "18px" }}>Colaboradores demo</h2>
            <div style={{ display: "grid", gap: "12px" }}>
              {demoUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUserId(user.id)}
                  style={{
                    textAlign: "left",
                    border: user.id === selectedUserId ? "2px solid #f28c38" : "1px solid #ddd",
                    background: user.id === selectedUserId ? "#fff4ea" : "#fff",
                    borderRadius: "12px",
                    padding: "12px",
                    cursor: "pointer",
                  }}
                >
                  <strong>{user.label}</strong>
                  <div>{user.name}</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>{user.role}</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>{user.site}</div>
                  <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>email: {user.email}</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>pass: {user.password}</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>whats: {user.phone}</div>
                  <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>{user.statusLabel}</div>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "12px",
                background: "#f7f7f7",
                fontSize: "13px",
              }}
            >
              <strong>Estado</strong>
              <div>Provider: {provider}</div>
              <div>IA: {mode}</div>
            </div>
          </aside>

          <section
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <header
              style={{
                padding: "16px",
                borderBottom: "1px solid #eee",
                background: "#f28c38",
                color: "#fff",
              }}
            >
              <strong>{selectedUser.name}</strong>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>{selectedUser.phone}</div>
              <div style={{ fontSize: "12px", opacity: 0.82 }}>{assistantPersona.displayName} | {assistantPersona.toneLabel}</div>
            </header>

            <div style={{ padding: "12px", borderBottom: "1px solid #eee", background: "#faf7f2" }}>
              <div style={{ fontSize: "13px", marginBottom: "8px" }}>
                <strong>Lectura actual:</strong> {summary}
              </div>
              {lastReport ? (
                <div style={{ fontSize: "13px" }}>
                  <strong>Ultimo reporte:</strong> {lastReport.title}
                </div>
              ) : null}
            </div>

            <div
              style={{
                minHeight: "420px",
                maxHeight: "420px",
                overflowY: "auto",
                padding: "16px",
                background: "#efe7dd",
                display: "grid",
                gap: "10px",
              }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    justifySelf: message.role === "user" ? "end" : "start",
                    maxWidth: "78%",
                    background: message.role === "user" ? "#dcf8c6" : message.role === "assistant" ? "#fff" : "#f1f1f1",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    whiteSpace: "pre-wrap",
                    fontSize: "14px",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="whatsapp-bubble-head" style={{ marginBottom: "4px" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px" }}>
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
                </div>
              ))}

              {!messages.length ? <div>No hay conversacion todavia.</div> : null}
            </div>

            <div style={{ padding: "12px", borderTop: "1px solid #eee", background: "#fff" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    style={{
                      border: "1px solid #f0d1b1",
                      background: "#fff7ef",
                      color: "#a95715",
                      borderRadius: "999px",
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Escribe como si fueras el colaborador..."
                  rows={3}
                  style={{
                    width: "100%",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    padding: "12px",
                    resize: "vertical",
                    font: "inherit",
                  }}
                />

                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={loading}
                  style={{
                    minWidth: "140px",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    background: loading ? "#d8d8d8" : "#f28c38",
                    color: "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  {loading ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
