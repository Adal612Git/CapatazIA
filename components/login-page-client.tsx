"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getDomainConfig } from "@/lib/domain-config";
import { useAppStore } from "@/lib/store";
import type { SystemMode } from "@/lib/types";

export function LoginPageClient({
  requestedSystem,
}: {
  requestedSystem: SystemMode;
}) {
  const router = useRouter();
  const login = useAppStore((state) => state.login);
  const users = useAppStore((state) => state.users);
  const sessionUserId = useAppStore((state) => state.sessionUserId);
  const systemMode = useAppStore((state) => state.systemMode);
  const initialize = useAppStore((state) => state.initialize);
  const switchSystemMode = useAppStore((state) => state.switchSystemMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("capataz123");
  const [error, setError] = useState("");
  const domain = getDomainConfig(requestedSystem);
  const resolvedEmail = users.some((user) => user.email === email) ? email : (users[0]?.email ?? email);
  const resolvedPassword =
    users.some((user) => user.email === resolvedEmail && user.password === password) ? password : (users[0]?.password ?? password);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (systemMode !== requestedSystem) {
      void switchSystemMode(requestedSystem);
    }
  }, [requestedSystem, switchSystemMode, systemMode]);

  useEffect(() => {
    if (sessionUserId && systemMode === requestedSystem) {
      router.replace("/dashboard");
    }
  }, [requestedSystem, router, sessionUserId, systemMode]);

  return (
    <main className={`login-shell ${requestedSystem === "hospital" ? "login-shell-hospital" : "login-shell-automotive"}`}>
      <section className="login-hero">
        <div className="hero-glow hero-glow-cyan" />
        <div className="hero-glow hero-glow-amber" />
        <div className="hero-brand-row">
          <div className="brand-mark-shell brand-mark-shell-lg">
            <Image alt="Capataz.ai" className="brand-mark-image" height={72} priority src="/brand/logo.png" width={72} />
          </div>
          <div>
            <p className="eyebrow">{domain.systemBadge}</p>
            <div className="brand-wordmark hero-wordmark">Capataz.ai</div>
          </div>
        </div>
        <h1>{domain.heroTitle}</h1>
        <p className="lead">{domain.heroDescription}</p>
        <div className="login-badges">
          {domain.loginBullets.map((bullet) => (
            <span key={bullet} className="badge">
              {bullet}
            </span>
          ))}
        </div>
        <div className="hero-card panel">
          <div>
            <p className="eyebrow">Acceso a demo premium</p>
            <h3>La interfaz ahora prioriza control inmediato, ritmo visual fino y lectura operativa real.</h3>
            <p className="module-copy">Capataz conserva la marca naranja, pero la usa como acento ejecutivo y no como ruido decorativo.</p>
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
            const result = login(resolvedEmail, resolvedPassword);
            if (!result.ok) {
              setError(result.message ?? "No fue posible iniciar sesion");
              return;
            }
            router.replace("/dashboard");
          }}
        >
          <label className="field">
            <span>Email</span>
            <input value={resolvedEmail} onChange={(event) => setEmail(event.target.value)} placeholder="laura@capataz.ai" />
          </label>
          <label className="field">
            <span>Contrasena</span>
            <input
              type="password"
              value={resolvedPassword}
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
              <h3>Perfiles listos para explorar la operacion</h3>
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
