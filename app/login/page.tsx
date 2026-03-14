"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore((state) => state.login);
  const users = useAppStore((state) => state.users);
  const sessionUserId = useAppStore((state) => state.sessionUserId);
  const initialize = useAppStore((state) => state.initialize);
  const [email, setEmail] = useState("laura@capataz.ai");
  const [password, setPassword] = useState("capataz123");
  const [error, setError] = useState("");

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (sessionUserId) {
      router.replace("/dashboard");
    }
  }, [router, sessionUserId]);

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="hero-glow hero-glow-cyan" />
        <div className="hero-glow hero-glow-amber" />
        <div className="hero-brand-row">
          <div className="brand-mark-shell brand-mark-shell-lg">
            <Image alt="Capataz.ai" className="brand-mark-image" height={72} priority src="/brand/capataz-mark.svg" width={72} />
          </div>
          <div>
            <p className="eyebrow">Capataz.ai | Control Automotriz</p>
            <div className="brand-wordmark hero-wordmark">Capataz.ai</div>
          </div>
        </div>
        <h1>Operacion comercial, atencion critica y post-venta en una sola vista.</h1>
        <p className="lead">
          Este demo aterriza la vertical automotriz: juntas diarias, pipeline comercial, incidentes de campana,
          seguimiento post-venta, reportes por vendedor y visibilidad por agencia.
        </p>
        <div className="login-badges">
          <span className="badge">Junta diaria, conversion y cierre</span>
          <span className="badge">Capataz Score 35/25/25/15</span>
          <span className="badge">Demo automotriz para grupos y agencias</span>
        </div>
        <div className="hero-card panel">
          <div>
            <p className="eyebrow">Mascota de marca</p>
            <h3>El cliente ya hablaba en naranja, blanco y visibilidad total.</h3>
            <p className="module-copy">El rediseño ya sigue ese lenguaje: limpio, directo y con foco en operacion real.</p>
          </div>
          <Image alt="Mascota Capataz.ai" className="hero-mascot" height={220} priority src="/brand/capataz-mascot.svg" width={220} />
        </div>
      </section>

      <section className="panel glass login-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Acceso seguro</p>
            <h2>Inicia sesion</h2>
          </div>
          <ShieldCheck className="icon-accent" size={28} />
        </div>

        <form
          className="stack-md"
          onSubmit={(event) => {
            event.preventDefault();
            const result = login(email, password);
            if (!result.ok) {
              setError(result.message ?? "No fue posible iniciar sesion");
              return;
            }
            router.replace("/dashboard");
          }}
        >
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="laura@capataz.ai" />
          </label>
          <label className="field">
            <span>Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="capataz123"
            />
          </label>
          {error ? <div className="status status-danger">{error}</div> : null}
          <button className="button-primary" type="submit">
            Entrar al dashboard
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="credentials">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Credenciales demo</p>
              <h3>Perfiles listos</h3>
            </div>
          </div>
          <div className="credential-grid">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                className="credential-card"
                onClick={() => {
                  setEmail(user.email);
                  setPassword(user.password);
                }}
              >
                <div className="avatar" style={{ background: user.accent }}>
                  {user.avatar}
                </div>
                <div>
                  <strong>{user.name}</strong>
                  <p>
                    {user.role} | {user.site}
                  </p>
                  <small>{user.email}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
