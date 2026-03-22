import Link from "next/link";
import { ArrowRight, Building2, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";

const systems = [
  {
    key: "automotive",
    title: "Capataz para Concesionarias",
    description: "Pipeline, juntas, post-venta, incidencias y multisucursal para grupos automotrices.",
    href: "/login?system=automotive",
    icon: Building2,
    bullets: ["Cierre comercial y pruebas de manejo", "Expedientes y campana", "Vista corporativa por agencia"],
    cta: "Abrir demo Auto",
  },
  {
    key: "hospital",
    title: "Capataz para Hospitales",
    description: "Admisiones, autorizaciones, continuidad de alta, incidentes y ocupacion multisede.",
    href: "/login?system=hospital",
    icon: HeartPulse,
    bullets: ["Huddle clinico y control de camas", "Aseguradoras y autorizaciones", "Seguimiento de alta e incidentes"],
    cta: "Abrir demo Care",
  },
];

export default function Home() {
  return (
    <main className="login-shell login-shell-system-picker">
      <section className="login-hero">
        <div className="hero-glow hero-glow-cyan" />
        <div className="hero-glow hero-glow-amber" />
        <div className="stack-md">
          <p className="eyebrow">Capataz.ai | Business Operating Systems</p>
          <h1>Dos verticales en un solo producto.</h1>
          <p className="lead">
            Capataz AI se presenta como centro de mando operativo. Elige la vertical que quieres abrir y entra a una
            demo seria, aspiracional y lista para junta comercial, hospitalaria o inversionistas.
          </p>
          <div className="login-badges">
            <span className="badge">
              <Sparkles size={14} />
              Runtime compartido, verticales separadas
            </span>
            <span className="badge">
              <ShieldCheck size={14} />
              Demos listas para login inmediato
            </span>
          </div>
        </div>
      </section>

      <section className="panel glass login-panel stack-md">
        <div>
          <p className="eyebrow">Selecciona sistema</p>
          <h2>Entrar a un vertical</h2>
        </div>
        <div className="stack-md">
          {systems.map((system) => {
            const Icon = system.icon;
            return (
              <Link key={system.key} href={system.href} className={`detail-card stack-sm system-option system-option-${system.key}`}>
                <div className="panel-header">
                  <div>
                    <strong>{system.title}</strong>
                    <p>{system.description}</p>
                  </div>
                  <Icon className="icon-accent" size={20} />
                </div>
                <div className="chip-row">
                  {system.bullets.map((bullet) => (
                    <span key={bullet} className="pill pill-muted">
                      {bullet}
                    </span>
                  ))}
                </div>
                <span className="report-chip">
                  {system.cta}
                  <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
