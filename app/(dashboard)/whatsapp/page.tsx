"use client";

import { useEffect, useMemo } from "react";
import { MessageCircleMore } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { KpiCard, StatusPill } from "@/components/ui/surface-primitives";
import { WhatsAppLab } from "@/components/whatsapp-lab";
import { azureSpeechReady } from "@/lib/azure-speech";
import { cloudWhatsAppReady, getWhatsAppProvider } from "@/lib/channels/whatsapp";
import { getDomainConfig } from "@/lib/domain-config";
import { useAppStore } from "@/lib/store";

export default function WhatsAppPage() {
  const initialize = useAppStore((state) => state.initialize);
  const users = useAppStore((state) => state.users);
  const systemMode = useAppStore((state) => state.systemMode);
  const domain = getDomainConfig(systemMode);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const contacts = useMemo(
    () =>
      users
        .filter((user) => Boolean(user.phone))
        .map((user) => ({
          userId: user.id,
          name: user.name,
          role: user.role,
          site: user.site,
          phone: user.phone as string,
        })),
    [users],
  );

  const provider = getWhatsAppProvider();
  const cloudReady = cloudWhatsAppReady();
  const premiumAudioReady = azureSpeechReady();

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Canal operativo"
        title="WhatsApp del Capataz"
        description={`Prueba el flujo conversacional de ${domain.reportContext} hoy en modo mock y deja listo el salto a Cloud API cuando entren las llaves.`}
        actions={
          <span className="report-chip">
            <MessageCircleMore size={14} />
            Conversational ops
          </span>
        }
      />

      <section className="hero-grid">
        <KpiCard label="Contactos" value={contacts.length} description="Roster disponible para pruebas y monitoreo conversacional." />
        <KpiCard label="Provider" value={provider} description={cloudReady ? "Canal listo para mensajes reales." : "Entorno controlado para demo y afinacion."} />
        <KpiCard label="Audio" value={premiumAudioReady ? "Premium" : "Fallback"} description="Salida de voz alineada a la misma experiencia del ecosistema." />
        <KpiCard label="Modo" value="Console" description="Menos playground, mas consola operativa premium." />
      </section>

      <section className="panel report-row">
        <div>
          <strong>Provider activo: {provider}</strong>
          <p>
            {provider === "cloud"
              ? cloudReady
                ? "Cloud API lista para webhook y mensajes reales."
                : "Cloud API seleccionada, pero faltan variables de entorno."
              : "Modo mock activo. Sirve para demo, pruebas y afinar prompts sin costo."}
          </p>
          <p>Audio IA: {premiumAudioReady ? "Azure Speech premium activo." : "Fallback al sintetizador del navegador."}</p>
        </div>
        <StatusPill tone={cloudReady ? "success" : "warning"}>{cloudReady ? "ready" : "setup"}</StatusPill>
      </section>

      <WhatsAppLab contacts={contacts} />
    </div>
  );
}
