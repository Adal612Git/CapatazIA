"use client";

import { startTransition, useEffect, useState } from "react";
import { BookText, FileText, LoaderCircle, MessageCircleMore, Send, Sparkles, Split } from "lucide-react";
import { getAssistantPersonaForUserId } from "@/lib/assistant-personas";
import { TtsPlayButton } from "@/components/tts-play-button";
import type {
  GeneratedReport,
  OperationalExtraction,
  OperationalNote,
  OperationalSuggestion,
  PublicCollaboratorContact,
} from "@/lib/capataz-operativo";

interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
  media?: {
    kind: "chart";
    url: string;
    alt: string;
  };
}

interface ChatPayload {
  provider: string;
  mode?: string;
  messages: ConversationMessage[];
  latestAnalysis?: OperationalExtraction | null;
  latestReport?: GeneratedReport | null;
  latestNotes?: OperationalNote[];
  latestSuggestions?: OperationalSuggestion[];
  stats?: {
    openTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    unreadAlerts: number;
    totalNotes: number;
    totalReports: number;
  };
}

interface WhatsAppLabProps {
  contacts: PublicCollaboratorContact[];
}

export function WhatsAppLab({ contacts }: WhatsAppLabProps) {
  const [selectedPhone, setSelectedPhone] = useState(contacts[0]?.phone ?? "");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [provider, setProvider] = useState("mock");
  const [mode, setMode] = useState("rules");
  const [input, setInput] = useState("mis tareas");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<OperationalExtraction | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [notes, setNotes] = useState<OperationalNote[]>([]);
  const [suggestions, setSuggestions] = useState<OperationalSuggestion[]>([]);
  const [stats, setStats] = useState<ChatPayload["stats"] | null>(null);

  useEffect(() => {
    if (!selectedPhone) {
      return;
    }

    let cancelled = false;

    async function loadThread() {
      setLoading(true);
      const response = await fetch(`/api/capataz/chat?phone=${encodeURIComponent(selectedPhone)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ChatPayload;

      if (cancelled) {
        return;
      }

      startTransition(() => {
        setProvider(payload.provider);
        setMode(payload.mode ?? "rules");
        setMessages(payload.messages ?? []);
        setAnalysis(payload.latestAnalysis ?? null);
        setReport(payload.latestReport ?? null);
        setNotes(payload.latestNotes ?? []);
        setSuggestions(payload.latestSuggestions ?? []);
        setStats(payload.stats ?? null);
        setLoading(false);
      });
    }

    void loadThread();

    return () => {
      cancelled = true;
    };
  }, [selectedPhone]);

  const selectedContact = contacts.find((contact) => contact.phone === selectedPhone) ?? null;
  const assistantPersona = getAssistantPersonaForUserId(selectedContact?.userId);

  async function sendMessage(text: string) {
    if (!selectedPhone || !text.trim()) {
      return;
    }

    setLoading(true);
    const response = await fetch("/api/capataz/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: selectedPhone,
        text,
      }),
    });

    const payload = (await response.json()) as ChatPayload;

    startTransition(() => {
      setProvider(payload.provider);
      setMode(payload.mode ?? "rules");
      setMessages(payload.messages ?? []);
      setAnalysis(payload.latestAnalysis ?? null);
      setReport(payload.latestReport ?? null);
      setNotes(payload.latestNotes ?? []);
      setSuggestions(payload.latestSuggestions ?? []);
      setStats(payload.stats ?? null);
      setInput("");
      setLoading(false);
    });
  }

  return (
    <section className="whatsapp-lab">
      <aside className="panel whatsapp-roster">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Colaboradores</p>
            <h3>Canal WhatsApp</h3>
          </div>
          <MessageCircleMore className="icon-accent" size={18} />
        </div>

        <div className="stack-sm">
          {contacts.map((contact) => (
            <button
              key={contact.userId}
              className={`contact-card ${contact.phone === selectedPhone ? "contact-card-active" : ""}`}
              type="button"
              onClick={() => setSelectedPhone(contact.phone)}
            >
              <div>
                <strong>{contact.name}</strong>
                <p>
                  {contact.role} | {contact.site}
                </p>
              </div>
              <small>{contact.phone}</small>
            </button>
          ))}
        </div>

        <div className="status status-warning">
          Provider: {provider}
          <br />
          IA: {mode}
          {stats ? (
            <>
              <br />
              abiertas: {stats.openTasks} | bloqueadas: {stats.blockedTasks} | reportes: {stats.totalReports}
            </>
          ) : null}
        </div>
      </aside>

      <div className="panel whatsapp-console">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Laboratorio</p>
            <h3>{selectedContact ? selectedContact.name : "Selecciona un colaborador"}</h3>
            <small>{assistantPersona.displayName} | {assistantPersona.toneLabel}</small>
          </div>
          <span className="pill pill-muted">{selectedContact?.phone ?? "sin numero"}</span>
        </div>

        <div className="whatsapp-thread">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`whatsapp-bubble ${
                message.role === "assistant"
                  ? "whatsapp-bubble-assistant"
                  : message.role === "system"
                    ? "whatsapp-bubble-system"
                    : "whatsapp-bubble-user"
              }`}
            >
              <div className="whatsapp-bubble-head">
                <strong>{message.role === "assistant" ? assistantPersona.displayName : message.role === "system" ? "Sistema" : "Colaborador"}</strong>
                {message.role === "assistant" ? (
                  <TtsPlayButton
                    text={message.text}
                    label={`Reproducir mensaje de ${assistantPersona.displayName}`}
                    userId={selectedContact?.userId}
                    preferredVoiceNames={assistantPersona.preferredVoiceNames}
                  />
                ) : null}
              </div>
              <p>{message.text}</p>
              {message.media?.kind === "chart" ? <img className="whatsapp-chart" src={message.media.url} alt={message.media.alt} /> : null}
            </article>
          ))}

          {!messages.length && !loading ? <div className="status">Todavia no hay mensajes en este hilo.</div> : null}
        </div>

        <div className="whatsapp-meta-grid">
          <article className="detail-card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Separacion</p>
                <h3>Lectura operativa</h3>
              </div>
              <Split className="icon-accent" size={18} />
            </div>
            {analysis ? (
              <div className="stack-sm">
                <p>{analysis.summary}</p>
                <small>Intent: {analysis.intent}</small>
                {analysis.detectedTasks.length ? <small>Tareas: {analysis.detectedTasks.join(" | ")}</small> : null}
                {analysis.blockers.length ? <small>Bloqueos: {analysis.blockers.join(" | ")}</small> : null}
                {analysis.followUps.length ? <small>Seguimiento: {analysis.followUps.join(" | ")}</small> : null}
                {analysis.requestedReport ? <small>Reporte: {analysis.requestedReport}</small> : null}
              </div>
            ) : (
              <p className="module-copy">Aun no hay separacion generada para este hilo.</p>
            )}
          </article>

          <article className="detail-card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Memoria</p>
                <h3>Notas y sugerencias</h3>
              </div>
              <BookText className="icon-accent" size={18} />
            </div>
            {notes.length || suggestions.length ? (
              <div className="stack-sm">
                {notes.slice(0, 2).map((note) => (
                  <p key={note.id} className="whatsapp-report">
                    <strong>{note.title}</strong>
                    <br />
                    {note.body}
                  </p>
                ))}
                {suggestions.slice(0, 2).map((suggestion) => (
                  <p key={suggestion.id} className="whatsapp-report">
                    <strong>{suggestion.title}</strong>
                    <br />
                    {suggestion.body}
                  </p>
                ))}
              </div>
            ) : (
              <p className="module-copy">Usa &quot;nota ...&quot; o &quot;sugerencias&quot; para que Capataz guarde memoria y recomendaciones.</p>
            )}
          </article>

          <article className="detail-card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Reporte</p>
                <h3>Ultimo generado</h3>
              </div>
              <FileText className="icon-accent" size={18} />
            </div>
            {report ? (
              <div className="stack-sm">
                <strong>{report.title}</strong>
                <p className="whatsapp-report">{report.body}</p>
              </div>
            ) : (
              <p className="module-copy">
                Pidele algo como &quot;reporte general&quot;, &quot;reporte bloqueos&quot; o &quot;reporte diego&quot;.
              </p>
            )}
          </article>
        </div>

        <div className="whatsapp-quick-actions">
          {[
            "mis tareas",
            "mis prospectos",
            "crear prospecto Mario Cazares | Taos Highline",
            "agendar prueba prs-1",
            "abrir operacion prs-1",
            "expedientes",
            "enviar expediente cf-1",
            "campana",
            "levantar campana Juan Perez | servicio | cliente molesto por entrega",
            "tomar campana inc-1",
            "resolver campana inc-1 | cliente atendido por gerencia",
            "mis seguimientos",
            "contactar seguimiento psf-1",
            "cerrar seguimiento psf-1",
            "nota cliente molesto por entrega tardia de unidad",
            "reporte general",
            "reporte bloqueos",
            "reporte diego",
            "sugerencias",
            "bloquear tsk-1 falta autorizacion de descuento",
            "separe esto: hay junta diaria, faltan pruebas de manejo y un cliente toco la campana",
          ].map((command) => (
            <button key={command} className="button-ghost" type="button" onClick={() => setInput(command)}>
              <Sparkles size={15} />
              {command}
            </button>
          ))}
        </div>

        <form
          className="whatsapp-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
        >
          <textarea
            rows={3}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribe como si fueras el colaborador..."
          />
          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}
