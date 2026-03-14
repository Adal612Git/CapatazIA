import { MessageCircleMore } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import { WhatsAppLab } from "@/components/whatsapp-lab";
import { getPublicCollaboratorContacts } from "@/lib/capataz-operativo";
import { cloudWhatsAppReady, getWhatsAppProvider } from "@/lib/channels/whatsapp";

export default function WhatsAppPage() {
  const contacts = getPublicCollaboratorContacts();
  const provider = getWhatsAppProvider();
  const cloudReady = cloudWhatsAppReady();

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Canal operativo"
        title="WhatsApp del Capataz"
        description="Prueba el flujo conversacional hoy en modo mock y deja listo el salto a Cloud API cuando entren las llaves."
        actions={<MessageCircleMore className="icon-accent" size={22} />}
      />

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
        </div>
        <span className={`pill ${cloudReady ? "priority-low" : "priority-medium"}`}>{cloudReady ? "ready" : "setup"}</span>
      </section>

      <WhatsAppLab contacts={contacts} />
    </div>
  );
}
