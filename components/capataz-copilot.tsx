"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Bot, X, LoaderCircle, Send, Sparkles } from "lucide-react";
import { useCurrentUser, useAppStore } from "@/lib/store";

interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
}

interface CopilotModuleHint {
  key: string;
  href: string;
  title: string;
  summary: string;
  actions: string[];
}

interface CopilotPayload {
  mode?: string;
  messages?: CopilotMessage[];
  latestAnalysis?: {
    summary?: string;
    intent?: string;
    confidence?: string;
    clarifyingQuestion?: string | null;
  } | null;
  currentModule?: CopilotModuleHint | null;
  suggestedModules?: CopilotModuleHint[];
}

export function CapatazCopilot() {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const systemMode = useAppStore((state) => state.systemMode);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [mode, setMode] = useState("rules");
  const [input, setInput] = useState("");
  const [currentModule, setCurrentModule] = useState<CopilotModuleHint | null>(null);
  const [suggestedModules, setSuggestedModules] = useState<CopilotModuleHint[]>([]);
  const [analysis, setAnalysis] = useState<CopilotPayload["latestAnalysis"]>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(() => {
    const modulePrompts = currentModule ? ["que puedo hacer aqui", `como uso ${currentModule.title.toLowerCase()}`] : ["que puedo hacer aqui"];
    return [...modulePrompts, "como creo una tarea", "donde veo alertas"].slice(0, 3);
  }, [currentModule]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const userId = currentUserId;
    let cancelled = false;

    async function loadSnapshot() {
      setLoading(true);
      const response = await fetch(
        `/api/capataz/copilot?userId=${encodeURIComponent(userId)}&systemMode=${encodeURIComponent(systemMode)}&currentPath=${encodeURIComponent(pathname)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as CopilotPayload;

      if (cancelled) {
        return;
      }

      startTransition(() => {
        setMessages(payload.messages ?? []);
        setMode(payload.mode ?? "rules");
        setCurrentModule(payload.currentModule ?? null);
        setSuggestedModules(payload.suggestedModules ?? []);
        setAnalysis(payload.latestAnalysis ?? null);
        setLoading(false);
      });
    }

    void loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, pathname, systemMode]);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  async function sendMessage(text: string) {
    if (!currentUserId || !text.trim()) {
      return;
    }

    setLoading(true);
    const response = await fetch("/api/capataz/copilot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: currentUserId,
        text,
        currentPath: pathname,
        systemMode,
      }),
    });

    const payload = (await response.json()) as CopilotPayload;

    startTransition(() => {
      setMessages(payload.messages ?? []);
      setMode(payload.mode ?? "rules");
      setCurrentModule(payload.currentModule ?? null);
      setSuggestedModules(payload.suggestedModules ?? []);
      setAnalysis(payload.latestAnalysis ?? null);
      setInput("");
      setOpen(true);
      setLoading(false);
    });
  }

  if (!currentUser) {
    return null;
  }

  return (
    <>
      {open ? (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            bottom: 16,
            width: "min(720px, calc(100vw - 32px))",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 16,
            borderRadius: 24,
            border: "1px solid rgba(104,72,44,0.16)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(245,240,234,0.98))",
            boxShadow: "0 24px 64px rgba(28, 22, 17, 0.22)",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flex: "0 0 auto",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>
                Copiloto IA
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>Capataz te guia</div>
              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>
                {mode === "gemini" ? "Modo premium con contexto vivo" : "Modo operativo determinista"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "1px solid rgba(104,72,44,0.14)",
                background: "rgba(255,255,255,0.92)",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              flex: "0 0 auto",
              borderRadius: 18,
              background: "rgba(255,248,242,0.95)",
              border: "1px solid rgba(104,72,44,0.12)",
              padding: "12px 14px",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{currentModule ? `${currentModule.title} ${currentModule.href}` : "Pantalla actual"}</div>
            <div style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.82 }}>
              {currentModule?.summary ?? "La IA puede decirte que hacer aqui o a donde ir despues."}
            </div>
            {analysis?.clarifyingQuestion ? (
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>Aclaracion pendiente: {analysis.clarifyingQuestion}</div>
            ) : analysis?.summary ? (
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>Lectura actual: {analysis.summary}</div>
            ) : null}
          </div>

          <div
            ref={messagesRef}
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              paddingRight: 4,
              paddingBottom: 4,
            }}
          >
            {messages.length ? (
              messages.map((message) => {
                const isUser = message.role === "user";
                const isAssistant = message.role === "assistant";
                return (
                  <article
                    key={message.id}
                    style={{
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      maxWidth: "88%",
                      padding: "12px 14px",
                      borderRadius: 18,
                      border: "1px solid rgba(104,72,44,0.12)",
                      background: isUser ? "rgba(242,122,42,0.16)" : isAssistant ? "rgba(255,255,255,0.96)" : "rgba(236,233,229,0.92)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ display: "block", marginBottom: 4, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>
                      {isUser ? currentUser.name : isAssistant ? "Capataz IA" : "Sistema"}
                    </div>
                    {message.text}
                  </article>
                );
              })
            ) : (
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(104,72,44,0.12)",
                  background: "rgba(255,255,255,0.96)",
                  padding: "14px 16px",
                }}
              >
                El copiloto esta listo para orientarte dentro del sistema.
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "0 0 auto" }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 2,
              }}
            >
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  style={{
                    flex: "0 0 auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(104,72,44,0.14)",
                    background: "rgba(255,255,255,0.92)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Sparkles size={14} />
                  {prompt}
                </button>
              ))}

              {suggestedModules.slice(0, 1).map((module) => (
                <Link
                  key={module.key}
                  href={module.href}
                  onClick={() => setOpen(false)}
                  style={{
                    flex: "0 0 auto",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(104,72,44,0.14)",
                    background: "rgba(242,122,42,0.1)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {module.title}
                </Link>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 128px",
                gap: 10,
                alignItems: "end",
              }}
            >
              <textarea
                rows={5}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ejemplo: donde veo mis alertas o que puedo hacer aqui"
                style={{
                  width: "100%",
                  minHeight: 120,
                  resize: "none",
                  borderRadius: 18,
                  border: "1px solid rgba(104,72,44,0.14)",
                  background: "rgba(255,255,255,0.98)",
                  padding: "14px 16px",
                  font: "inherit",
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 52,
                  borderRadius: 16,
                  border: 0,
                  background: "#f27a2a",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: loading ? "progress" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
                Enviar
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 9998,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderRadius: 999,
          border: 0,
          background: "#f27a2a",
          color: "#fff",
          fontWeight: 700,
          boxShadow: "0 20px 40px rgba(28,22,17,0.2)",
          cursor: "pointer",
        }}
      >
        <Bot size={16} />
        Capataz IA
      </button>
    </>
  );
}
