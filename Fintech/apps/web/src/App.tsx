import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { SectionCard } from './components/section-card';
import {
  createOrderIntent,
  createTransfer,
  loadDashboard,
  sendSharkCommand,
} from './lib/api';
import { formatCompactNumber, formatDate, formatMoney } from './lib/format';
import type { SharkResponse } from './lib/types';

function App() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('Muéstrame la liquidez actual');
  const [latestReply, setLatestReply] = useState<SharkResponse | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [intentNote, setIntentNote] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: loadDashboard,
  });

  const sharkMutation = useMutation({
    mutationFn: sendSharkCommand,
    onSuccess: (response) => {
      setLatestReply(response);
    },
  });

  const transferMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: async (response) => {
      setTransferNote(response.nextStep);
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const intentMutation = useMutation({
    mutationFn: createOrderIntent,
    onSuccess: async (response) => {
      setIntentNote(response.narrative);
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      return;
    }
    sharkMutation.mutate(prompt);
  };

  if (dashboardQuery.isLoading) {
    return (
      <main className="loading-shell">
        <div className="loading-card">
          <p className="eyebrow">TPC Fintech</p>
          <h1>Construyendo consola ejecutiva</h1>
          <p>Cargando dashboard, wallet, portfolio, approvals y command center.</p>
        </div>
      </main>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <main className="loading-shell">
        <div className="loading-card">
          <p className="eyebrow">Error de conexion</p>
          <h1>No pude levantar el dashboard</h1>
          <p>Arranca el API en `http://localhost:3000` o ajusta `VITE_API_BASE_URL`.</p>
        </div>
      </main>
    );
  }

  const data = dashboardQuery.data;
  const primaryAccount = data.walletAccounts[0];
  const primaryBeneficiary = data.beneficiaries[0];

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">{data.overview.phase}</p>
          <h1>{data.overview.product}</h1>
          <p className="hero-copy__text">{data.overview.promise}</p>
          <div className="tag-row">
            {data.overview.architecture.map((item) => (
              <span key={item} className="tag-chip">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-rail">
          <div className="hero-identity">
            <span className="hero-identity__label">Owner activo</span>
            <strong>{data.overview.currentUser.fullName}</strong>
            <span>{data.overview.currentUser.title}</span>
          </div>
          <div className="hero-identity">
            <span className="hero-identity__label">Canal primario</span>
            <strong>{data.overview.primaryChannel}</strong>
            <span>{data.overview.organization.name}</span>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {data.overview.metrics.map((metric) => (
          <article key={metric.label} className={`metric-card metric-card--${metric.tone ?? 'cyan'}`}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.hint}</span>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="content-column">
          <SectionCard
            eyebrow="Mr. Shark"
            title="Command center"
            aside={<span className="status-pill">WhatsApp-first</span>}
          >
            <form className="command-form" onSubmit={handleSubmit}>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Pregúntale por liquidez, transferencias, portafolio o approvals."
              />
              <div className="chip-row">
                {data.commands.map((command) => (
                  <button
                    key={command}
                    type="button"
                    className="ghost-chip"
                    onClick={() => setPrompt(`Quiero revisar ${command}`)}
                  >
                    {command}
                  </button>
                ))}
              </div>
              <button className="primary-button" type="submit" disabled={sharkMutation.isPending}>
                {sharkMutation.isPending ? 'Pensando...' : 'Ejecutar comando'}
              </button>
            </form>

            <div className="response-card">
              <p className="response-card__label">Memoria operativa</p>
              <ul className="simple-list">
                {data.sharkContext.memory.map((memory) => (
                  <li key={memory}>{memory}</li>
                ))}
              </ul>

              {latestReply ? (
                <div className="response-card__reply">
                  <span>{latestReply.detectedIntent}</span>
                  <strong>{latestReply.reply}</strong>
                  <div className="chip-row">
                    {latestReply.suggestedActions.map((action) => (
                      <span key={action} className="tag-chip">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Wallet ejecutiva"
            title="Liquidez y movimientos"
            aside={<span className="status-pill">{formatDate(data.walletBalances.asOf)}</span>}
          >
            <div className="balance-strip">
              <div>
                <span>MXN disponible</span>
                <strong>{formatMoney(data.walletBalances.totalMxn)}</strong>
              </div>
              <div>
                <span>USD puente</span>
                <strong>{formatMoney(data.walletBalances.totalUsd, 'USD')}</strong>
              </div>
              <div>
                <span>Threshold approval</span>
                <strong>{formatMoney(data.walletBalances.threshold)}</strong>
              </div>
            </div>

            <div className="stack-list">
              {data.walletAccounts.map((account) => (
                <article key={account.id} className="list-card">
                  <div>
                    <strong>{account.name}</strong>
                    <span>{account.kind} · {account.alias}</span>
                  </div>
                  <div className="list-card__meta">
                    <strong>{formatMoney(account.available, account.currency)}</strong>
                    <span>Pendiente {formatCompactNumber(account.pending)}</span>
                  </div>
                </article>
              ))}
            </div>

            <button
              className="secondary-button"
              type="button"
              disabled={transferMutation.isPending}
              onClick={() =>
                transferMutation.mutate({
                  fromWalletAccountId: primaryAccount.id,
                  beneficiaryId: primaryBeneficiary.id,
                  amount: 145000,
                  concept: 'Pago operativo VIP',
                })
              }
            >
              {transferMutation.isPending ? 'Simulando...' : 'Simular transferencia a approval'}
            </button>
            {transferNote ? <p className="callout">{transferNote}</p> : null}

            <div className="timeline">
              {data.walletMovements.map((movement) => (
                <article key={movement.id} className="timeline-item">
                  <div>
                    <strong>{movement.counterparty}</strong>
                    <span>{movement.reference}</span>
                  </div>
                  <div className="timeline-item__meta">
                    <strong className={movement.amount < 0 ? 'negative' : 'positive'}>
                      {formatMoney(movement.amount, 'MXN')}
                    </strong>
                    <span>{movement.status}</span>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="Approvals" title="Thresholds y control operativo">
            <div className="stack-list">
              {data.approvals.map((approval) => (
                <article key={approval.id} className="list-card">
                  <div>
                    <strong>{approval.title}</strong>
                    <span>{approval.policy}</span>
                  </div>
                  <div className="list-card__meta">
                    <strong>{formatMoney(approval.amount)}</strong>
                    <span className={`status-tag status-tag--${approval.status}`}>{approval.status}</span>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="content-column">
          <SectionCard
            eyebrow="Portfolio"
            title="Resumen patrimonial"
            aside={<span className="status-pill">{data.riskProfile.label}</span>}
          >
            <div className="balance-strip">
              <div>
                <span>AUM demo</span>
                <strong>{formatMoney(data.portfolioSummary.totalValue)}</strong>
              </div>
              <div>
                <span>Cash</span>
                <strong>{data.portfolioSummary.cashPct}%</strong>
              </div>
              <div>
                <span>Perf mensual</span>
                <strong>{data.portfolioSummary.monthlyPerformancePct}%</strong>
              </div>
            </div>

            <p className="subtle-copy">
              Benchmark {data.portfolioSummary.benchmark}. Horizonte {data.riskProfile.horizon}.
            </p>

            <div className="stack-list">
              {data.portfolioPositions.map((position) => (
                <article key={position.id} className="list-card">
                  <div>
                    <strong>{position.symbol} · {position.name}</strong>
                    <span>{position.thesis}</span>
                  </div>
                  <div className="list-card__meta">
                    <strong>{formatMoney(position.marketValue)}</strong>
                    <span>{position.weightPct}% · PnL {position.pnlPct}%</span>
                  </div>
                </article>
              ))}
            </div>

            <button
              className="secondary-button"
              type="button"
              disabled={intentMutation.isPending}
              onClick={() =>
                intentMutation.mutate({
                  portfolioId: data.portfolioSummary.id,
                  symbol: 'NVDA',
                  side: 'buy',
                  amount: 650000,
                  rationale: 'Reforzar exposicion AI con guardrail de approval.',
                })
              }
            >
              {intentMutation.isPending ? 'Registrando...' : 'Crear order intent demo'}
            </button>
            {intentNote ? <p className="callout">{intentNote}</p> : null}
          </SectionCard>

          <SectionCard eyebrow="Capataz" title="Operacion y seguimiento">
            <div className="stack-list">
              {data.tasks.map((task) => (
                <article key={task.id} className="list-card">
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.owner} · {task.lane}</span>
                  </div>
                  <div className="list-card__meta">
                    <strong>{formatDate(task.dueAt)}</strong>
                    <span className={`status-tag status-tag--${task.status}`}>{task.status}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mini-grid">
              <div className="mini-panel">
                <p className="mini-panel__title">Recordatorios</p>
                <ul className="simple-list">
                  {data.reminders.map((reminder) => (
                    <li key={reminder.id}>
                      {reminder.title} · {reminder.channel}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mini-panel">
                <p className="mini-panel__title">Workflows activos</p>
                <ul className="simple-list">
                  {data.workflows.map((workflow) => (
                    <li key={workflow.id}>
                      {workflow.name} · {workflow.state}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Audit trail" title="Evidencia y narrativa de sistema">
            <div className="timeline">
              {data.auditEvents.map((event) => (
                <article key={event.id} className="timeline-item">
                  <div>
                    <strong>{event.action}</strong>
                    <span>{event.actor} · {event.channel}</span>
                  </div>
                  <div className="timeline-item__meta timeline-item__meta--wide">
                    <strong>{event.summary}</strong>
                    <span>{formatDate(event.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="Roadmap" title="Sprint plan ejecutable">
            <div className="stack-list">
              {data.overview.roadmap.map((item) => (
                <article key={item.id} className="roadmap-card">
                  <div className="roadmap-card__top">
                    <strong>{item.horizon}</strong>
                    <span className={`status-tag status-tag--${item.status}`}>{item.status}</span>
                  </div>
                  <p>{item.objective}</p>
                  <span>{item.deliverable}</span>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="footer-note">
        <p>Riesgos principales</p>
        <div className="chip-row">
          {data.overview.topRisks.map((risk) => (
            <span key={risk} className="ghost-chip ghost-chip--static">
              {risk}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
