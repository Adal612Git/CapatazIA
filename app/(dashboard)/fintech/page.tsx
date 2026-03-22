"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BadgeDollarSign, CreditCard, Landmark, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { ModuleHeader } from "@/components/module-header";
import {
  buildFinanceTeamSnapshot,
  buildFinanceTrend,
  formatFinanceMoney,
  getFinanceProductsForUser,
  getUserFinanceAccounts,
  getUserFinanceApplications,
  getUserFinanceMovements,
  getVisibleFinanceInsights,
} from "@/lib/fintech";
import { useCurrentUser, useAppStore } from "@/lib/store";

function FintechKpi({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="metric-card panel report-kpi-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="report-kpi-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function FintechPage() {
  const currentUser = useCurrentUser();
  const users = useAppStore((state) => state.users);
  const scoreSnapshots = useAppStore((state) => state.scoreSnapshots);
  const financeAccounts = useAppStore((state) => state.financeAccounts);
  const financeMovements = useAppStore((state) => state.financeMovements);
  const financeApplications = useAppStore((state) => state.financeApplications);
  const financeInsights = useAppStore((state) => state.financeInsights);

  if (!currentUser) {
    return null;
  }

  const scopedAccounts = getUserFinanceAccounts(currentUser.id, financeAccounts);
  const scopedMovements = getUserFinanceMovements(currentUser.id, financeMovements);
  const scopedApplications = getUserFinanceApplications(currentUser.id, financeApplications);
  const eligibleProducts = getFinanceProductsForUser(currentUser.id, scoreSnapshots);
  const visibleInsights = getVisibleFinanceInsights(currentUser, financeInsights, financeApplications).slice(0, 4);
  const teamSnapshot = buildFinanceTeamSnapshot(users, scoreSnapshots, financeAccounts, financeApplications).slice(0, 6);
  const trend = buildFinanceTrend(scopedMovements);
  const availableBalance = scopedAccounts.reduce((sum, account) => sum + account.availableBalance, 0);
  const pendingBalance = scopedAccounts.reduce((sum, account) => sum + account.pendingBalance, 0);
  const creditLimit = scopedAccounts.reduce((sum, account) => sum + (account.creditLimit ?? 0), 0);
  const unlockedProducts = eligibleProducts.filter((product) => product.unlocked).length;

  return (
    <div className="stack-lg">
      <ModuleHeader
        eyebrow="Capital del equipo"
        title="Fintech laboral conectada al mismo Capataz"
        description="Saldo, beneficios, solicitudes y elegibilidad movidos por score y disciplina operativa, no por un mock aislado."
        actions={
          <span className="report-chip">
            <Sparkles size={14} />
            runtime unificado
          </span>
        }
      />

      <section className="hero-grid">
        <FintechKpi label="Saldo disponible" value={formatFinanceMoney(availableBalance)} detail="Wallet y beneficios visibles para la demostracion movil y web." icon={<Wallet size={18} />} />
        <FintechKpi label="Saldo pendiente" value={formatFinanceMoney(pendingBalance)} detail="Reservas por solicitudes y dispersiones pendientes de aprobar." icon={<Landmark size={18} />} />
        <FintechKpi label="Linea visible" value={formatFinanceMoney(creditLimit)} detail="Capacidad total demo ligada al desempeno del colaborador." icon={<CreditCard size={18} />} />
        <FintechKpi label="Productos desbloqueados" value={`${unlockedProducts}/${eligibleProducts.length}`} detail="Cada producto responde al Capataz Score actual." icon={<BadgeDollarSign size={18} />} />
      </section>

      <section className="report-chart-grid">
        <article className="panel chart-panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Flujo financiero</p>
              <h3>Entradas y salidas del colaborador</h3>
            </div>
            <span className="report-chip">ultimos meses</span>
          </div>
          <div className="report-chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef7d2d" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef7d2d" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3dfd0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatFinanceMoney(Number(value ?? 0))} />
                <Area type="monotone" dataKey="inflow" stroke="#22c55e" fill="url(#inflowGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="outflow" stroke="#ef7d2d" fill="url(#outflowGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="module-copy">La app Expo consume el mismo bundle financiero para que la narrativa coincida entre movil, dashboard y WhatsApp.</p>
        </article>

        <article className="panel chart-panel stack-sm report-chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Equipo visible</p>
              <h3>Score y capital por colaborador</h3>
            </div>
            <span className="report-chip">demo completa</span>
          </div>
          <div className="report-chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamSnapshot} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3dfd0" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} />
                <Tooltip formatter={(value, key) => (key === "balance" ? formatFinanceMoney(Number(value ?? 0)) : value)} />
                <Bar dataKey="score" fill="#f07a2b" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="report-metric-grid">
            {teamSnapshot.map((member) => (
              <div key={member.userId} className="agency-metric">
                <strong>{member.score}</strong>
                <p>
                  {member.name.split(" ")[0]}: {formatFinanceMoney(member.balance)} y {member.activeApplications} solicitudes activas.
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack-sm report-insight-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Productos elegibles</p>
              <h3>Oferta personalizada por score</h3>
            </div>
            <ShieldCheck className="icon-accent" size={18} />
          </div>
          {eligibleProducts.map((product) => (
            <div key={product.id} className="detail-card report-insight-item">
              <strong>{product.name}</strong>
              <p>{product.description}</p>
              <span className="report-chip">
                {product.unlocked ? `${formatFinanceMoney(product.maxAmount)} disponible` : `faltan ${product.scoreGap} pts`}
              </span>
            </div>
          ))}
        </article>

        <article className="panel stack-sm report-insight-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Solicitudes</p>
              <h3>Credito y beneficios en curso</h3>
            </div>
            <CreditCard className="icon-accent" size={18} />
          </div>
          {scopedApplications.length ? (
            scopedApplications.map((application) => (
              <div key={application.id} className="detail-card report-insight-item">
                <strong>{application.productName}</strong>
                <p>
                  {formatFinanceMoney(application.requestedAmount)} · {application.termLabel}
                </p>
                <span className="report-chip">{application.status}</span>
              </div>
            ))
          ) : (
            <p className="module-copy">Todavia no hay solicitudes registradas para este usuario.</p>
          )}
        </article>
      </section>

      <section className="panel stack-sm">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Lectura IA</p>
            <h3>Senales financieras del sistema</h3>
          </div>
        </div>
        <div className="dashboard-grid">
          {visibleInsights.map((insight) => (
            <div key={insight.id} className="detail-card report-insight-item">
              <strong>{insight.title}</strong>
              <p>{insight.body}</p>
              <span className="report-chip">{insight.tone}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
